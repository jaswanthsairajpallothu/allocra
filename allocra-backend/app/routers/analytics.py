from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from uuid import UUID

from app.database import get_db
from app.auth import get_current_user, require_plan
from app.models import User, AllocationRun, ProjectMember, Task, TaskStatus, PlanTier
from app.schemas import AnalyticsOut

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("/project", response_model=AnalyticsOut)
async def project_analytics(
    project_id: UUID,
    current_user: User = Depends(require_plan("TEAM")),
    db: AsyncSession = Depends(get_db),
):
    pm = await db.scalar(
        select(ProjectMember).where(
            ProjectMember.project_id == project_id,
            ProjectMember.user_id == current_user.id,
        )
    )
    if not pm:
        raise HTTPException(status_code=403, detail="Not a member of this project.")

    # Last 10 allocation runs for trends
    runs_result = await db.execute(
        select(AllocationRun)
        .where(AllocationRun.project_id == project_id)
        .order_by(AllocationRun.created_at.desc())
        .limit(10)
    )
    runs = runs_result.scalars().all()

    avg_load_trend = [
        {
            "run": i + 1,
            "avg_score": r.avg_score,
            "assigned": r.assigned_count,
            "total": r.task_count,
            "date": r.created_at.isoformat(),
        }
        for i, r in enumerate(reversed(runs))
    ]

    # Risk score trend
    risk_score_trend = [
        {
            "run": i + 1,
            "risk": r.top_risk or "LOW",
            "date": r.created_at.isoformat(),
        }
        for i, r in enumerate(reversed(runs))
    ]

    # Skill coverage
    members_result = await db.execute(
        select(ProjectMember).where(ProjectMember.project_id == project_id)
    )
    members = members_result.scalars().all()
    skill_map: dict = {}
    for m in members:
        for s in (m.skills or []):
            sn = s["name"]
            if sn not in skill_map:
                skill_map[sn] = {"skill": sn, "count": 0, "avg_level": 0.0, "levels": []}
            skill_map[sn]["count"] += 1
            skill_map[sn]["levels"].append(s.get("level", 1))

    skill_coverage = []
    for sn, data in skill_map.items():
        avg_lv = sum(data["levels"]) / len(data["levels"]) if data["levels"] else 0
        skill_coverage.append({"skill": sn, "member_count": data["count"], "avg_level": round(avg_lv, 1)})

    # Task completion rate
    from sqlalchemy import func
    total = await db.scalar(select(func.count()).where(Task.project_id == project_id)) or 0
    completed = await db.scalar(
        select(func.count()).where(Task.project_id == project_id, Task.status == TaskStatus.COMPLETED)
    ) or 0
    completion_rate = round((completed / total * 100), 1) if total > 0 else 0.0

    # Most overloaded member
    most_overloaded = None
    max_load = 0.0
    for m in members:
        if m.load_percent > max_load:
            max_load = m.load_percent
            user_q = await db.scalar(select(User).where(User.id == m.user_id))
            if user_q:
                most_overloaded = user_q.name

    # Allocation efficiency (avg score across last runs)
    alloc_efficiency = round(
        sum(r.avg_score for r in runs) / len(runs), 1
    ) if runs else 0.0

    return AnalyticsOut(
        avg_load_trend=avg_load_trend,
        skill_coverage=skill_coverage,
        task_completion_rate=completion_rate,
        risk_score_trend=risk_score_trend,
        most_overloaded=most_overloaded,
        allocation_efficiency=alloc_efficiency,
    )
