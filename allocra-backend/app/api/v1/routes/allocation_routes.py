from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.domain.user import User
from app.models.domain.task import Task
from app.services.allocator.allocator import allocate
from app.services.user_service import get_all_users
from app.services.task_service import get_all_tasks

router = APIRouter(prefix="/allocate", tags=["Allocation"])

@router.post("/")
def run_allocation(db: Session = Depends(get_db)):
    db_users = get_all_users(db)
    db_tasks = get_all_tasks(db)
    if not db_users:
        raise HTTPException(status_code=400, detail="No users in database")
    if not db_tasks:
        raise HTTPException(status_code=400, detail="No tasks in database")
    users = [
        User(id=u.id, name=u.name, skills={s.skill_name: s.level for s in u.skills}, available_hours=u.available_hours)
        for u in db_users
    ]
    tasks = [
        Task(id=t.id, title=t.title, required_skill=t.required_skill, difficulty=t.difficulty, priority=t.priority, deadline=t.deadline)
        for t in db_tasks
    ]
    return allocate(users, tasks)
