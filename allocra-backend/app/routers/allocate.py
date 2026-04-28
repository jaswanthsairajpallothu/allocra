"""Allocation router — hardened. Plain dicts only, no ORM lazy loads."""
from __future__ import annotations

import logging
import traceback
import asyncio
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from uuid import UUID

from app.database import get_db
from app.auth import get_current_user
from app.models import (
    User, Task, ProjectMember, Project, AllocationRun,
    TaskStatus, PlanTier
)
from app.engines.scoring import (
    MemberSnapshot, TaskSnapshot,
    run_allocation, generate_optimization_suggestions, generate_system_insights,
)
from app.routers._helpers import log_activity, create_notification
from app.email_service import send_task_assigned, send_allocation_summary, send_risk_alert

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/allocate", tags=["allocate"])


@router.post("")
async def run_allocation_endpoint(
    project_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        pm_check = await db.scalar(
            select(ProjectMember).where(
                ProjectMember.project_id == project_id,
                ProjectMember.user_id == current_user.id,
            )
        )
        if not pm_check:
            raise HTTPException(status_code=403, detail="Not a member of this project.")

        project = await db.scalar(select(Project).where(Project.id == project_id))
        if not project:
            raise HTTPException(status_code=404, detail="Project not found.")

        # Fetch PENDING tasks
        task_result = await db.execute(
            select(Task).where(
                Task.project_id == project_id,
                Task.status == TaskStatus.PENDING,
            )
        )
        raw_tasks = task_result.scalars().all()
        if not raw_tasks:
            raise HTTPException(status_code=400, detail="No pending tasks to allocate.")

        # Fetch project members with user names
        member_result = await db.execute(
            select(ProjectMember, User)
            .join(User, User.id == ProjectMember.user_id)
            .where(ProjectMember.project_id == project_id)
        )
        member_rows = member_result.all()
        if not member_rows:
            raise HTTPException(status_code=400, detail="Add team members before running allocation.")

        # Build snapshots
        task_snapshots = [
            TaskSnapshot(
                task_id=t.id,
                title=t.title,
                required_skill=t.required_skill,
                required_level=t.required_level,
                estimated_hours=t.estimated_hours,
                priority=t.priority.value,
            )
            for t in raw_tasks
        ]

        member_snapshots = [
            MemberSnapshot(
                membership_id=pm.id,
                user_id=pm.user_id,
                name=u.name or u.email or str(u.id),
                skills=pm.skills or [],
                available_hours=pm.available_hours,
                assigned_hours=pm.assigned_hours,
            )
            for pm, u in member_rows
        ]

        # Run engine
        decisions = run_allocation(task_snapshots, member_snapshots)

        user_map = {u.id: u for _, u in member_rows}
        assignments_out = []
        unassigned_out = []

        for decision in decisions:
            db_task = next(t for t in raw_tasks if t.id == decision.task.task_id)

            if decision.assigned and decision.member:
                db_task.assigned_to = decision.member.user_id
                db_task.status = TaskStatus.ASSIGNED

                db_pm = next(pm for pm, u in member_rows if pm.user_id == decision.member.user_id)
                db_pm.assigned_hours += decision.task.estimated_hours

                assignments_out.append({
                    "task_id": str(decision.task.task_id),
                    "task_title": decision.task.title,
                    "assigned_to_user_id": str(decision.member.user_id),
                    "assigned_to_name": decision.member.name,
                    "score": decision.score,
                    "breakdown": {
                        "skill": decision.breakdown.skill,
                        "workload": decision.breakdown.workload,
                        "availability": decision.breakdown.availability,
                        "priority_bonus": decision.breakdown.priority_bonus,
                    },
                    "risk_score": decision.risk.score,
                    "risk_level": decision.risk.level,
                    "risk_reasons": decision.risk.reasons,
                    "load_after": decision.load_after,
                })
            else:
                unassigned_out.append({
                    "task_id": str(decision.task.task_id),
                    "task_title": decision.task.title,
                    "reason": decision.unassigned_reason or "No eligible member found",
                })

        await db.flush()

        avg_score = (
            sum(a["score"] for a in assignments_out) / len(assignments_out)
            if assignments_out else 0.0
        )

        risk_order = {"HIGH": 3, "MEDIUM": 2, "LOW": 1}
        top_risk = "LOW"
        for a in assignments_out:
            if risk_order.get(a["risk_level"], 0) > risk_order.get(top_risk, 0):
                top_risk = a["risk_level"]

        # Optimization suggestions and insights (TEAM plan only)
        opt_suggestions = []
        sys_insights = []
        if current_user.plan_tier == PlanTier.TEAM:
            try:
                raw_sugg = generate_optimization_suggestions(decisions, member_snapshots)
                opt_suggestions = [
                    {
                        "task_id": s["task_id"],
                        "task_title": s["task_title"],
                        "from_user": s["from_user"],
                        "to_user": s["to_user"],
                        "reason": s["reason"],
                    }
                    for s in raw_sugg
                ]
                raw_insights = generate_system_insights(task_snapshots, member_snapshots, decisions)
                sys_insights = raw_insights
            except Exception as exc:
                logger.error("Optimization/insights failed: %s", exc)

        # Persist run record
        run = AllocationRun(
            project_id=project_id,
            run_by=current_user.id,
            task_count=len(raw_tasks),
            assigned_count=len(assignments_out),
            avg_score=round(avg_score, 2),
            top_risk=top_risk,
            result_payload={
                "assignments": assignments_out,
                "unassigned": unassigned_out,
                "suggestions": opt_suggestions,
                "insights": sys_insights,
            },
        )
        db.add(run)
        await db.flush()

        try:
            await log_activity(
                db, project_id, "ALLOCATION_RUN", current_user.id,
                f"Allocation: {len(assignments_out)}/{len(raw_tasks)} assigned"
            )
        except Exception as exc:
            logger.error("Activity log failed: %s", exc)

        # Background notifications — don't block response
        asyncio.create_task(
            _post_allocation_notifications(
                assignments_out=assignments_out,
                user_map=user_map,
                project=project,
                current_user=current_user,
                assigned_count=len(assignments_out),
                unassigned_count=len(unassigned_out),
                avg_score=avg_score,
            )
        )

        return JSONResponse(content={
            "run_id": str(run.id),
            "project_id": str(project_id),
            "assigned": len(assignments_out),
            "unassigned": len(unassigned_out),
            "total_tasks": len(raw_tasks),
            "avg_score": round(avg_score, 2),
            "assignments": assignments_out,
            "unassigned_tasks": unassigned_out,
            "optimization_suggestions": opt_suggestions,
            "system_insights": sys_insights,
            "created_at": run.created_at.isoformat() if run.created_at else None,
        })

    except HTTPException:
        raise
    except Exception:
        logger.error("run_allocation 500:\n%s", traceback.format_exc())
        raise HTTPException(status_code=500, detail="Allocation failed. Check server logs.")


@router.get("/history")
async def allocation_history(
    project_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        if current_user.plan_tier == PlanTier.FREE:
            raise HTTPException(
                status_code=403,
                detail={"error": "plan_required", "required": "PRO", "current": "FREE"},
            )

        pm = await db.scalar(
            select(ProjectMember).where(
                ProjectMember.project_id == project_id,
                ProjectMember.user_id == current_user.id,
            )
        )
        if not pm:
            raise HTTPException(status_code=403, detail="Not a member of this project.")

        result = await db.execute(
            select(AllocationRun)
            .where(AllocationRun.project_id == project_id)
            .order_by(AllocationRun.created_at.desc())
            .limit(20)
        )
        runs = result.scalars().all()

        return JSONResponse(content=[
            {
                "id": str(r.id),
                "task_count": r.task_count,
                "assigned_count": r.assigned_count,
                "avg_score": float(r.avg_score or 0),
                "top_risk": r.top_risk,
                "created_at": r.created_at.isoformat() if r.created_at else None,
            }
            for r in runs
        ])

    except HTTPException:
        raise
    except Exception:
        logger.error("allocation_history 500:\n%s", traceback.format_exc())
        raise HTTPException(status_code=500, detail="Failed to fetch allocation history.")


async def _post_allocation_notifications(
    assignments_out: list,
    user_map: dict,
    project: Project,
    current_user: User,
    assigned_count: int,
    unassigned_count: int,
    avg_score: float,
):
    try:
        from uuid import UUID as _UUID
        for a in assignments_out:
            uid = _UUID(a["assigned_to_user_id"]) if a.get("assigned_to_user_id") else None
            if uid and uid in user_map:
                u = user_map[uid]
                if u.email_notifications:
                    await send_task_assigned(u.email, u.name, a["task_title"], project.name)
                if a["risk_level"] == "HIGH" and u.email_notifications:
                    await send_risk_alert(u.email, u.name, a["task_title"], a["risk_reasons"])

        if current_user.email_notifications:
            await send_allocation_summary(
                current_user.email, current_user.name, project.name,
                assigned_count, unassigned_count, avg_score,
            )
    except Exception as exc:
        logger.error("Post-allocation notifications failed: %s", exc)