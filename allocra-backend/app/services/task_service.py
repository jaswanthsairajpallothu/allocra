from sqlalchemy.orm import Session
from app.models.db.task_model import TaskDB
from app.schemas.task_schema import TaskCreateSchema
from typing import List, Optional

def create_task(db: Session, data: TaskCreateSchema) -> TaskDB:
    task = TaskDB(**data.model_dump())
    db.add(task)
    db.commit()
    db.refresh(task)
    return task

def get_all_tasks(db: Session) -> List[TaskDB]:
    return db.query(TaskDB).all()

def get_task_by_id(db: Session, task_id: int) -> Optional[TaskDB]:
    return db.query(TaskDB).filter(TaskDB.id == task_id).first()

def delete_task(db: Session, task_id: int) -> bool:
    task = get_task_by_id(db, task_id)
    if not task:
        return False
    db.delete(task)
    db.commit()
    return True
