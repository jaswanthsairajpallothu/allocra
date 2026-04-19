from app.core.constants import LOAD_SAFE_THRESHOLD, LOAD_WARNING_THRESHOLD, LoadStatus

def compute_load_pct(assigned_hours: float, available_hours: float) -> float:
    if available_hours <= 0:
        return 100.0
    return round((assigned_hours / available_hours) * 100, 2)

def classify_load(load_pct: float) -> LoadStatus:
    if load_pct < LOAD_SAFE_THRESHOLD:
        return LoadStatus.SAFE
    elif load_pct <= LOAD_WARNING_THRESHOLD:
        return LoadStatus.WARNING
    return LoadStatus.OVERLOAD

def get_member_skill_level(skills: list[dict], required_skill: str) -> int | None:
    for entry in skills:
        if entry["skill"].lower() == required_skill.lower():
            return entry["level"]
    return None
