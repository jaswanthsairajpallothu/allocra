import uuid
from fastapi import HTTPException
from sqlalchemy.orm import Session
from app.models.membership import Membership
from app.models.task import Task
from app.models.user import User
from app.schemas.task_schema import TaskCreate, TaskOut, TaskUpdate

def _assert_project_member(db, project_id, user_id):
    if not db.query(Membership).filter(Membership.project_id == project_id, Membership.user_id == user_id).first():
        raise HTTPException(status_code=403, detail="Not a member of this project")

def create_task(payload: TaskCreate, current_user: User, db: Session) -> TaskOut:
    _assert_project_member(db, payload.project_id, current_user.id)
    task = Task(**payload.model_dump(), created_by=current_user.id)
    db.add(task); db.commit(); db.refresh(task)
    return TaskOut.model_validate(task)

def list_tasks(project_id: uuid.UUID, current_user: User, db: Session) -> list[TaskOut]:
    _assert_project_member(db, project_id, current_user.id)
    return [TaskOut.model_validate(t) for t in db.query(Task).filter(Task.project_id == project_id).all()]

def update_task(task_id: uuid.UUID, payload: TaskUpdate, current_user: User, db: Session) -> TaskOut:
    task = db.get(Task, task_id)
    if not task: raise HTTPException(status_code=404, detail="Task not found")
    _assert_project_member(db, task.project_id, current_user.id)
    for k, v in payload.model_dump(exclude_none=True).items():
        setattr(task, k, v)
    db.commit(); db.refresh(task)
    return TaskOut.model_validate(task)

def delete_task(task_id: uuid.UUID, current_user: User, db: Session) -> dict:
    task = db.get(Task, task_id)
    if not task: raise HTTPException(status_code=404, detail="Task not found")
    _assert_project_member(db, task.project_id, current_user.id)
    db.delete(task); db.commit()
    return {"message": "Task deleted"}
