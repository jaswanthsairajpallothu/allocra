"""Analytics router — hardened. Plain dicts only, no ORM lazy loads."""
from __future__ import annotations

import logging
import traceback
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from uuid import UUID

from app.database import get_db
from app.auth import get_current_user, require_plan
from app.models import User, AllocationRun, ProjectMember, Task, TaskStatus

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("/project")
async def project_analytics(
    project_id: UUID,
    current_user: User = Depends(require_plan("TEAM")),
    db: AsyncSession = Depends(get_db),
):
    try:
        pm = await db.scalar(
            select(ProjectMember).where(
                ProjectMember.project_id == project_id,
                ProjectMember.user_id == current_user.id,
            )
        )
        if not pm:
            raise HTTPException(status_code=403, detail="Not a member of this project.")

        # ── Last 10 allocation runs ──────────────────────────────────────
        runs_result = await db.execute(
            select(AllocationRun)
            .where(AllocationRun.project_id == project_id)
            .order_by(AllocationRun.created_at.desc())
            .limit(10)
        )
        runs = list(reversed(runs_result.scalars().all()))

        avg_load_trend = [
            {
                "run": i + 1,
                "avg_score": float(r.avg_score or 0),
                "assigned": int(r.assigned_count or 0),
                "total": int(r.task_count or 0),
                "date": r.created_at.isoformat() if r.created_at else None,
            }
            for i, r in enumerate(runs)
        ]

        risk_score_trend = [
            {
                "run": i + 1,
                "risk": r.top_risk or "LOW",
                "date": r.created_at.isoformat() if r.created_at else None,
            }
            for i, r in enumerate(runs)
        ]

        # ── Skill coverage ───────────────────────────────────────────────
        members_result = await db.execute(
            select(ProjectMember).where(ProjectMember.project_id == project_id)
        )
        members = members_result.scalars().all()

        skill_map: dict = {}
        for m in members:
            for s in (m.skills or []):
                sn = s.get("name", "")
                if not sn:
                    continue
                if sn not in skill_map:
                    skill_map[sn] = {"skill": sn, "member_count": 0, "levels": []}
                skill_map[sn]["member_count"] += 1
                skill_map[sn]["levels"].append(s.get("level", 1))

        skill_coverage = [
            {
                "skill": sn,
                "member_count": d["member_count"],
                "avg_level": round(sum(d["levels"]) / len(d["levels"]), 1) if d["levels"] else 0.0,
            }
            for sn, d in skill_map.items()
        ]

        # ── Task completion rate ─────────────────────────────────────────
        total = await db.scalar(
            select(func.count()).where(Task.project_id == project_id)
        ) or 0

        completed = await db.scalar(
            select(func.count()).where(
                Task.project_id == project_id,
                Task.status == TaskStatus.COMPLETED,
            )
        ) or 0

        completion_rate = round((completed / total * 100), 1) if total > 0 else 0.0

        # ── Most overloaded member ───────────────────────────────────────
        most_overloaded = None
        max_load = 0.0
        for m in members:
            lp = (
                min(100.0, (m.assigned_hours / m.available_hours) * 100)
                if m.available_hours > 0 else 100.0
            )
            if lp > max_load:
                max_load = lp
                user = await db.scalar(select(User).where(User.id == m.user_id))
                if user:
                    most_overloaded = user.name

        # ── Allocation efficiency ────────────────────────────────────────
        alloc_efficiency = (
            round(sum(r.avg_score for r in runs) / len(runs), 1)
            if runs else 0.0
        )

        return JSONResponse(content={
            "avg_load_trend": avg_load_trend,
            "skill_coverage": skill_coverage,
            "task_completion_rate": completion_rate,
            "risk_score_trend": risk_score_trend,
            "most_overloaded": most_overloaded,
            "allocation_efficiency": alloc_efficiency,
        })

    except HTTPException:
        raise
    except Exception:
        logger.error("project_analytics 500:\n%s", traceback.format_exc())
        raise HTTPException(status_code=500, detail="Failed to load analytics.")