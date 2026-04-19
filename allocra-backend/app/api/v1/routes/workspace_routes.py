import uuid
from fastapi import APIRouter
from app.core.dependencies import CurrentUser, DBSession
from app.schemas.workspace_schema import WorkspaceCreate, WorkspaceInviteOut, WorkspaceJoin, WorkspaceOut
from app.services import workspace_service

router = APIRouter(prefix="/workspaces", tags=["Workspaces"])

@router.post("", response_model=WorkspaceOut, status_code=201)
def create_workspace(payload: WorkspaceCreate, current_user: CurrentUser, db: DBSession):
    return workspace_service.create_workspace(payload, current_user, db)

@router.get("", response_model=list[WorkspaceOut])
def list_workspaces(current_user: CurrentUser, db: DBSession):
    return workspace_service.list_workspaces(current_user, db)

@router.post("/{workspace_id}/invite", response_model=WorkspaceInviteOut)
def get_invite(workspace_id: uuid.UUID, current_user: CurrentUser, db: DBSession):
    return workspace_service.get_invite_code(workspace_id, current_user, db)

@router.post("/join", response_model=WorkspaceOut)
def join_workspace(payload: WorkspaceJoin, current_user: CurrentUser, db: DBSession):
    return workspace_service.join_workspace(payload, current_user, db)
