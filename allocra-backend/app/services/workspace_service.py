import random, string
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from app.core.constants import JOIN_CODE_LENGTH
from app.models.user import User
from app.models.workspace import Workspace, WorkspaceMember
from app.schemas.workspace_schema import WorkspaceCreate, WorkspaceInviteOut, WorkspaceJoin, WorkspaceOut

def _generate_join_code(db):
    chars = string.ascii_uppercase + string.digits
    for _ in range(20):
        code = "".join(random.choices(chars, k=JOIN_CODE_LENGTH))
        if not db.query(Workspace).filter(Workspace.join_code == code).first():
            return code
    raise RuntimeError("Could not generate unique join code")

def _assert_workspace_member(db, workspace_id, user_id):
    if not db.query(WorkspaceMember).filter(WorkspaceMember.workspace_id == workspace_id, WorkspaceMember.user_id == user_id).first():
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not a member of this workspace")

def create_workspace(payload: WorkspaceCreate, current_user: User, db: Session) -> WorkspaceOut:
    ws = Workspace(name=payload.name, join_code=_generate_join_code(db), created_by=current_user.id)
    db.add(ws); db.flush()
    db.add(WorkspaceMember(workspace_id=ws.id, user_id=current_user.id))
    db.commit(); db.refresh(ws)
    return WorkspaceOut.model_validate(ws)

def list_workspaces(current_user: User, db: Session) -> list[WorkspaceOut]:
    mems = db.query(WorkspaceMember).filter(WorkspaceMember.user_id == current_user.id).all()
    ids = [m.workspace_id for m in mems]
    if not ids: return []
    return [WorkspaceOut.model_validate(w) for w in db.query(Workspace).filter(Workspace.id.in_(ids)).all()]

def get_invite_code(workspace_id, current_user: User, db: Session) -> WorkspaceInviteOut:
    _assert_workspace_member(db, workspace_id, current_user.id)
    ws = db.get(Workspace, workspace_id)
    if not ws: raise HTTPException(status_code=404, detail="Workspace not found")
    return WorkspaceInviteOut(join_code=ws.join_code)

def join_workspace(payload: WorkspaceJoin, current_user: User, db: Session) -> WorkspaceOut:
    ws = db.query(Workspace).filter(Workspace.join_code == payload.join_code).first()
    if not ws: raise HTTPException(status_code=404, detail="Invalid join code")
    if db.query(WorkspaceMember).filter(WorkspaceMember.workspace_id == ws.id, WorkspaceMember.user_id == current_user.id).first():
        raise HTTPException(status_code=409, detail="Already a member of this workspace")
    db.add(WorkspaceMember(workspace_id=ws.id, user_id=current_user.id))
    db.commit(); db.refresh(ws)
    return WorkspaceOut.model_validate(ws)
