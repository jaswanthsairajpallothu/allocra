import uuid
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from app.models.membership import Membership
from app.models.project import Project
from app.models.user import User
from app.models.workspace import WorkspaceMember
from app.schemas.project_schema import AddMemberToProject, ProjectCreate, ProjectOut

def _assert_workspace_member(db, workspace_id, user_id):
    if not db.query(WorkspaceMember).filter(WorkspaceMember.workspace_id == workspace_id, WorkspaceMember.user_id == user_id).first():
        raise HTTPException(status_code=403, detail="Not a member of this workspace")

def create_project(payload: ProjectCreate, current_user: User, db: Session) -> ProjectOut:
    _assert_workspace_member(db, payload.workspace_id, current_user.id)
    project = Project(name=payload.name, description=payload.description, workspace_id=payload.workspace_id, created_by=current_user.id)
    db.add(project); db.flush()
    db.add(Membership(user_id=current_user.id, project_id=project.id, skills=[], available_hours=0))
    db.commit(); db.refresh(project)
    return ProjectOut.model_validate(project)

def list_projects(workspace_id: uuid.UUID, current_user: User, db: Session) -> list[ProjectOut]:
    _assert_workspace_member(db, workspace_id, current_user.id)
    return [ProjectOut.model_validate(p) for p in db.query(Project).filter(Project.workspace_id == workspace_id).all()]

def add_member(project_id: uuid.UUID, payload: AddMemberToProject, current_user: User, db: Session) -> dict:
    project = db.get(Project, project_id)
    if not project: raise HTTPException(status_code=404, detail="Project not found")
    _assert_workspace_member(db, project.workspace_id, current_user.id)
    _assert_workspace_member(db, project.workspace_id, payload.user_id)
    if db.query(Membership).filter(Membership.user_id == payload.user_id, Membership.project_id == project_id).first():
        raise HTTPException(status_code=409, detail="User already in this project")
    db.add(Membership(user_id=payload.user_id, project_id=project_id, skills=[], available_hours=0))
    db.commit()
    return {"message": "Member added to project"}
