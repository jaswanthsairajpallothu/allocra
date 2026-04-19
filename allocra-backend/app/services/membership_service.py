import uuid
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from app.allocator.utils import classify_load, compute_load_pct
from app.models.allocation import Allocation
from app.models.membership import Membership
from app.models.task import Task
from app.models.user import User
from app.schemas.membership_schema import MemberLoadOut, MembershipAvailabilityUpdate, MembershipOut, MembershipSkillsUpdate

def _get_membership_or_404(membership_id, db):
    m = db.get(Membership, membership_id)
    if not m: raise HTTPException(status_code=404, detail="Membership not found")
    return m

def update_skills(membership_id, payload: MembershipSkillsUpdate, current_user: User, db: Session) -> MembershipOut:
    m = _get_membership_or_404(membership_id, db)
    if m.user_id != current_user.id: raise HTTPException(status_code=403, detail="Cannot edit another member's skills")
    m.skills = [s.model_dump() for s in payload.skills]
    db.commit(); db.refresh(m)
    return MembershipOut.model_validate(m)

def update_availability(membership_id, payload: MembershipAvailabilityUpdate, current_user: User, db: Session) -> MembershipOut:
    m = _get_membership_or_404(membership_id, db)
    if m.user_id != current_user.id: raise HTTPException(status_code=403, detail="Cannot edit another member's availability")
    m.available_hours = payload.available_hours
    db.commit(); db.refresh(m)
    return MembershipOut.model_validate(m)

def get_team_load(project_id: uuid.UUID, db: Session) -> list[MemberLoadOut]:
    memberships = db.query(Membership).filter(Membership.project_id == project_id).all()
    result = []
    for m in memberships:
        rows = db.query(Task.estimated_hours).join(Allocation, Allocation.task_id == Task.id).filter(Allocation.membership_id == m.id).all()
        total = sum(r[0] for r in rows)
        load_pct = compute_load_pct(total, m.available_hours)
        user = db.get(User, m.user_id)
        result.append(MemberLoadOut(
            membership_id=m.id, user_id=m.user_id, user_name=user.name if user else "Unknown",
            load_pct=load_pct, assigned_hours=total, available_hours=m.available_hours,
            status=classify_load(load_pct), skills=m.skills,
        ))
    return result
