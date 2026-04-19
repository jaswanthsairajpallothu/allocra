import uuid
from fastapi import HTTPException
from sqlalchemy.orm import Session
from app.allocator.allocator import run_allocation
from app.models.allocation import Allocation
from app.models.membership import Membership
from app.models.task import Task
from app.models.user import User
from app.core.constants import TaskStatus
from app.schemas.allocation_schema import AllocationRequest, AllocationRunOut

def _get_existing_hours(memberships, db):
    result = {}
    for m in memberships:
        rows = db.query(Task.estimated_hours).join(Allocation, Allocation.task_id == Task.id).filter(Allocation.membership_id == m.id, Task.status == TaskStatus.ASSIGNED).all()
        result[m.id] = sum(r[0] for r in rows)
    return result

def allocate(payload: AllocationRequest, current_user: User, db: Session) -> AllocationRunOut:
    tasks = db.query(Task).filter(Task.project_id == payload.project_id, Task.status == TaskStatus.PENDING).all()
    if not tasks: raise HTTPException(status_code=400, detail="No pending tasks to allocate in this project")
    memberships = db.query(Membership).filter(Membership.project_id == payload.project_id).all()
    if not memberships: raise HTTPException(status_code=400, detail="No members found in this project")
    users = db.query(User).filter(User.id.in_([m.user_id for m in memberships])).all()
    user_name_map = {u.id: u.name for u in users}
    run_result = run_allocation(tasks=tasks, memberships=memberships, user_name_map=user_name_map, existing_assigned_hours=_get_existing_hours(memberships, db))
    membership_id_map = {m.user_id: m.id for m in memberships}
    task_map = {t.id: t for t in tasks}
    for assignment in run_result.assignments:
        mid = membership_id_map.get(assignment.assigned_to_user_id)
        if not mid: continue
        task_map[assignment.task_id].status = TaskStatus.ASSIGNED
        db.add(Allocation(
            run_id=run_result.run_id, project_id=payload.project_id, task_id=assignment.task_id,
            membership_id=mid, score=assignment.score, score_breakdown=assignment.score_breakdown.model_dump(),
            risk_score=assignment.risk.risk_score, risk_level=assignment.risk.risk_level,
            risk_reasons=assignment.risk.reasons, workload_after=assignment.workload_after,
        ))
    db.commit()
    return run_result

def get_allocation_history(project_id: uuid.UUID, db: Session) -> list[dict]:
    allocs = db.query(Allocation).filter(Allocation.project_id == project_id).order_by(Allocation.created_at.desc()).all()
    runs: dict[uuid.UUID, list] = {}
    for a in allocs:
        runs.setdefault(a.run_id, []).append(a)
    return [{"run_id": str(rid), "created_at": entries[0].created_at.isoformat(), "task_count": len(entries)} for rid, entries in runs.items()]
