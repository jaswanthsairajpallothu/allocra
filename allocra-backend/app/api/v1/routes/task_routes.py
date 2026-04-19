import uuid
from fastapi import APIRouter
from app.core.dependencies import CurrentUser, DBSession
from app.schemas.task_schema import TaskCreate, TaskOut, TaskUpdate
from app.services import task_service

router = APIRouter(prefix="/tasks", tags=["Tasks"])

@router.post("", response_model=TaskOut, status_code=201)
def create_task(payload: TaskCreate, current_user: CurrentUser, db: DBSession):
    return task_service.create_task(payload, current_user, db)

@router.get("", response_model=list[TaskOut])
def list_tasks(project_id: uuid.UUID, current_user: CurrentUser, db: DBSession):
    return task_service.list_tasks(project_id, current_user, db)

@router.patch("/{task_id}", response_model=TaskOut)
def update_task(task_id: uuid.UUID, payload: TaskUpdate, current_user: CurrentUser, db: DBSession):
    return task_service.update_task(task_id, payload, current_user, db)

@router.delete("/{task_id}")
def delete_task(task_id: uuid.UUID, current_user: CurrentUser, db: DBSession):
    return task_service.delete_task(task_id, current_user, db)
