from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.schemas.task_schema import TaskCreateSchema, TaskResponseSchema
from app.services import task_service
from typing import List

router = APIRouter(prefix="/tasks", tags=["Tasks"])

@router.post("/", response_model=TaskResponseSchema)
def create_task(data: TaskCreateSchema, db: Session = Depends(get_db)):
    return task_service.create_task(db, data)

@router.get("/", response_model=List[TaskResponseSchema])
def get_tasks(db: Session = Depends(get_db)):
    return task_service.get_all_tasks(db)

@router.get("/{task_id}", response_model=TaskResponseSchema)
def get_task(task_id: int, db: Session = Depends(get_db)):
    task = task_service.get_task_by_id(db, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return task

@router.delete("/{task_id}")
def delete_task(task_id: int, db: Session = Depends(get_db)):
    deleted = task_service.delete_task(db, task_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Task not found")
    return {"message": f"Task {task_id} deleted"}
