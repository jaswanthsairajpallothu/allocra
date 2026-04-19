from app.models.membership import Membership
from app.models.task import Task

def filter_candidates(task: Task, members: list[Membership]) -> list[Membership]:
    return [m for m in members if m.available_hours > 0]
