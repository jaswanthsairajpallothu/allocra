from typing import List
from app.models.domain.user import User
from app.models.domain.task import Task

def sort_tasks_by_priority(tasks: List[Task]) -> List[Task]:
    return sorted(tasks, key=lambda t: t.priority, reverse=True)

def reset_user_loads(users: List[User]) -> None:
    for user in users:
        user.current_load = 0.0
