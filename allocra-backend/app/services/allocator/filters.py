from typing import List
from app.models.domain.user import User
from app.models.domain.task import Task

def get_eligible_users(users: List[User], task: Task) -> List[User]:
    eligible = []
    for user in users:
        has_skill = user.skills.get(task.required_skill, 0) >= 1
        free_hours = user.available_hours - user.current_load
        has_capacity = free_hours >= task.difficulty
        if has_skill and has_capacity:
            eligible.append(user)
    return eligible
