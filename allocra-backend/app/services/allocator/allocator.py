from typing import List, Dict
from app.models.domain.user import User
from app.models.domain.task import Task
from app.services.allocator.scoring import compute_score
from app.services.allocator.filters import get_eligible_users
from app.services.allocator.utils import sort_tasks_by_priority, reset_user_loads
from app.utils.logger import get_logger

logger = get_logger(__name__)

def allocate(users: List[User], tasks: List[Task]) -> Dict:
    reset_user_loads(users)
    sorted_tasks = sort_tasks_by_priority(tasks)
    assigned: Dict[int, int] = {}
    unassigned: List[int] = []
    reasoning: Dict[int, dict] = {}
    for task in sorted_tasks:
        eligible = get_eligible_users(users, task)
        if not eligible:
            unassigned.append(task.id)
            reasoning[task.id] = {"reason": "No eligible user found"}
            continue
        scored = [(user, compute_score(user, task)) for user in eligible]
        best_user, best_score = max(scored, key=lambda x: (x[1], -x[0].current_load))
        assigned[task.id] = best_user.id
        best_user.current_load += task.difficulty
        reasoning[task.id] = {
            "assigned_to": best_user.name,
            "score": best_score,
            "skill_level": best_user.skills.get(task.required_skill),
            "load_after_assignment": best_user.current_load
        }
    return {"assigned": assigned, "unassigned": unassigned, "reasoning": reasoning}
