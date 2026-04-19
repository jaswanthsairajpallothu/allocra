import uuid
from fastapi import APIRouter
from app.core.dependencies import CurrentUser, DBSession
from app.schemas.membership_schema import MemberLoadOut, MembershipAvailabilityUpdate, MembershipOut, MembershipSkillsUpdate
from app.services import membership_service

router = APIRouter(prefix="/memberships", tags=["Memberships"])

@router.patch("/{membership_id}/skills", response_model=MembershipOut)
def update_skills(membership_id: uuid.UUID, payload: MembershipSkillsUpdate, current_user: CurrentUser, db: DBSession):
    return membership_service.update_skills(membership_id, payload, current_user, db)

@router.patch("/{membership_id}/availability", response_model=MembershipOut)
def update_availability(membership_id: uuid.UUID, payload: MembershipAvailabilityUpdate, current_user: CurrentUser, db: DBSession):
    return membership_service.update_availability(membership_id, payload, current_user, db)

@router.get("/team-load", response_model=list[MemberLoadOut])
def team_load(project_id: uuid.UUID, db: DBSession, current_user: CurrentUser):
    return membership_service.get_team_load(project_id, db)
