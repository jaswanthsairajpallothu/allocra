from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List
from uuid import UUID
import asyncio

from app.database import get_db
from app.auth import get_current_user
from app.models import (
    User, Task, ProjectMember, Project, AllocationRun, TaskStatus, PlanTier
)
from app.schemas import AllocationResult, AllocationHistoryItem, ScoreBreakdown, AssignmentResult, OptimizationSuggestion, SystemInsight
from app.engines.scoring import (
    MemberSnapshot, TaskSnapshot,
    run_allocation, generate_optimization_suggestions, generate_system_insights,
)
from app.routers._helpers import log_activity, create_notification
from app.email_service import send_task_assigned, send_allocation_summary, send_risk_alert

router = APIRouter(prefix="/allocate", tags=["allocate"])


@router.post("", response_model=AllocationResult, status_code=200)
async def run_allocation_endpoint(
    project_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Must be project member
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
        select(Task).where(Task.project_id == project_id, Task.status == TaskStatus.PENDING)
    )
    raw_tasks = task_result.scalars().all()
    if not raw_tasks:
        raise HTTPException(status_code=400, detail="No pending tasks to allocate.")

    # Fetch project members
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
            name=u.name,
            skills=pm.skills or [],
            available_hours=pm.available_hours,
            assigned_hours=pm.assigned_hours,  # include existing load
        )
        for pm, u in member_rows
    ]

    # Run engine
    decisions = run_allocation(task_snapshots, member_snapshots)

    # Build member snapshot map for suggestions
    member_map = {ms.user_id: ms for ms in member_snapshots}
    user_map = {u.id: u for _, u in member_rows}

    # Apply decisions to DB
    assignments_out: List[AssignmentResult] = []
    unassigned_out = []

    for decision in decisions:
        # Find the matching DB task
        db_task = next(t for t in raw_tasks if t.id == decision.task.task_id)

        if decision.assigned and decision.member:
            db_task.assigned_to = decision.member.user_id
            db_task.status = TaskStatus.ASSIGNED

            # Update member assigned_hours in DB
            db_pm = next(pm for pm, u in member_rows if pm.user_id == decision.member.user_id)
            db_pm.assigned_hours += decision.task.estimated_hours

            assignments_out.append(
                AssignmentResult(
                    task_id=decision.task.task_id,
                    task_title=decision.task.title,
                    assigned_to_user_id=decision.member.user_id,
                    assigned_to_name=decision.member.name,
                    score=decision.score,
                    breakdown=ScoreBreakdown(
                        skill=decision.breakdown.skill,
                        workload=decision.breakdown.workload,
                        availability=decision.breakdown.availability,
                        priority_bonus=decision.breakdown.priority_bonus,
                    ),
                    risk_score=decision.risk.score,
                    risk_level=decision.risk.level,
                    risk_reasons=decision.risk.reasons,
                    load_after=decision.load_after,
                )
            )
        else:
            unassigned_out.append({
                "task_id": str(decision.task.task_id),
                "task_title": decision.task.title,
                "reason": decision.unassigned_reason or "No eligible member found",
            })

    await db.flush()

    # Compute stats
    avg_score = (
        sum(a.score for a in assignments_out) / len(assignments_out)
        if assignments_out else 0.0
    )
    top_risk_value = "LOW"
    risk_order = {"HIGH": 3, "MEDIUM": 2, "LOW": 1}
    for a in assignments_out:
        if risk_order.get(a.risk_level.value if hasattr(a.risk_level, "value") else a.risk_level, 0) > risk_order.get(top_risk_value, 0):
            top_risk_value = a.risk_level.value if hasattr(a.risk_level, "value") else a.risk_level

    # Optimization suggestions (Team plan)
    opt_suggestions = []
    sys_insights = []
    if current_user.plan_tier == PlanTier.TEAM:
        raw_suggestions = generate_optimization_suggestions(decisions, member_snapshots)
        opt_suggestions = [OptimizationSuggestion(**s) for s in raw_suggestions]

        raw_insights = generate_system_insights(task_snapshots, member_snapshots, decisions)
        sys_insights = [SystemInsight(**i) for i in raw_insights]

    # Persist AllocationRun record
    run = AllocationRun(
        project_id=project_id,
        run_by=current_user.id,
        task_count=len(raw_tasks),
        assigned_count=len(assignments_out),
        avg_score=round(avg_score, 2),
        top_risk=top_risk_value,
        result_payload={
            "assignments": [a.model_dump(mode="json") for a in assignments_out],
            "unassigned": unassigned_out,
            "suggestions": [s.model_dump(mode="json") for s in opt_suggestions],
            "insights": [i.model_dump(mode="json") for i in sys_insights],
        },
    )
    db.add(run)
    await db.flush()

    await log_activity(
        db, project_id, "ALLOCATION_RUN", current_user.id,
        f"Allocation run: {len(assignments_out)}/{len(raw_tasks)} assigned"
    )

    # ── Post-allocation notifications (fire and don't await to keep response fast) ──
    asyncio.create_task(
        _send_post_allocation_notifications(
            assignments_out=assignments_out,
            user_map=user_map,
            project=project,
            current_user=current_user,
            assigned_count=len(assignments_out),
            unassigned_count=len(unassigned_out),
            avg_score=avg_score,
        )
    )

    return AllocationResult(
        run_id=run.id,
        project_id=project_id,
        assigned=len(assignments_out),
        unassigned=len(unassigned_out),
        total_tasks=len(raw_tasks),
        avg_score=round(avg_score, 2),
        assignments=assignments_out,
        unassigned_tasks=unassigned_out,
        optimization_suggestions=opt_suggestions,
        system_insights=sys_insights,
        created_at=run.created_at,
    )


@router.get("/history", response_model=List[AllocationHistoryItem])
async def allocation_history(
    project_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Pro+ required for history
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
    return result.scalars().all()


# ─── Background notification sender ─────────────────────────────────────────

async def _send_post_allocation_notifications(
    assignments_out: List[AssignmentResult],
    user_map: dict,
    project: Project,
    current_user: User,
    assigned_count: int,
    unassigned_count: int,
    avg_score: float,
):
    """Send emails and in-app notifications after allocation. Non-blocking."""
    try:
        for a in assignments_out:
            if a.assigned_to_user_id and a.assigned_to_user_id in user_map:
                u = user_map[a.assigned_to_user_id]
                if u.email_notifications:
                    await send_task_assigned(
                        to=u.email,
                        assignee_name=u.name,
                        task_title=a.task_title,
                        project_name=project.name,
                    )
                # High-risk alert
                risk_val = a.risk_level.value if hasattr(a.risk_level, "value") else a.risk_level
                if risk_val == "HIGH" and u.email_notifications:
                    await send_risk_alert(u.email, u.name, a.task_title, a.risk_reasons)

        # Summary to run initiator
        if current_user.email_notifications:
            await send_allocation_summary(
                to=current_user.email,
                creator_name=current_user.name,
                project_name=project.name,
                assigned=assigned_count,
                unassigned=unassigned_count,
                avg_score=avg_score,
            )
    except Exception as e:
        import logging
        logging.getLogger(__name__).error("Post-allocation notification error: %s", e)
