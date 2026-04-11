from app.models.domain.user import User
from app.models.domain.task import Task

def compute_score(user: User, task: Task) -> float:
    raw_skill = user.skills.get(task.required_skill, 0)
    skill_match = raw_skill / 5.0
    free_hours = user.available_hours - user.current_load
    free_time_score = min(free_hours / user.available_hours, 1.0) if user.available_hours > 0 else 0.0
    load_ratio = user.current_load / user.available_hours if user.available_hours > 0 else 1.0
    load_penalty = min(load_ratio, 1.0)
    priority_score = task.priority / 5.0
    score = (5 * skill_match) + (3 * free_time_score) - (4 * load_penalty) + (2 * priority_score)
    return round(score, 4)
