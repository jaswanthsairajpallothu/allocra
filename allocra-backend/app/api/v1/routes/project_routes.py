import uuid
from fastapi import APIRouter
from app.core.dependencies import CurrentUser, DBSession
from app.schemas.project_schema import AddMemberToProject, ProjectCreate, ProjectOut
from app.services import project_service

router = APIRouter(prefix="/projects", tags=["Projects"])

@router.post("", response_model=ProjectOut, status_code=201)
def create_project(payload: ProjectCreate, current_user: CurrentUser, db: DBSession):
    return project_service.create_project(payload, current_user, db)

@router.get("", response_model=list[ProjectOut])
def list_projects(workspace_id: uuid.UUID, current_user: CurrentUser, db: DBSession):
    return project_service.list_projects(workspace_id, current_user, db)

@router.post("/{project_id}/add-member")
def add_member(project_id: uuid.UUID, payload: AddMemberToProject, current_user: CurrentUser, db: DBSession):
    return project_service.add_member(project_id, payload, current_user, db)
