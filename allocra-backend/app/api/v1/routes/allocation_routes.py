import uuid
from fastapi import APIRouter
from app.core.dependencies import CurrentUser, DBSession
from app.schemas.allocation_schema import AllocationRequest, AllocationRunOut
from app.services import allocation_service

router = APIRouter(prefix="/allocate", tags=["Allocation"])

@router.post("", response_model=AllocationRunOut)
def run_allocation(payload: AllocationRequest, current_user: CurrentUser, db: DBSession):
    return allocation_service.allocate(payload, current_user, db)

@router.get("/history", response_model=list[dict])
def allocation_history(project_id: uuid.UUID, db: DBSession, current_user: CurrentUser):
    return allocation_service.get_allocation_history(project_id, db)
