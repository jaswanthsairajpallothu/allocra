from dataclasses import dataclass
from typing import Any
from app.core.constants import PRIORITY_HIGH_MULTIPLIER, SCORE_WEIGHT_AVAILABILITY, SCORE_WEIGHT_SKILL, SCORE_WEIGHT_WORKLOAD, Priority

@dataclass(frozen=True)
class ScoreResult:
    score: float
    breakdown: dict[str, float]
    skill_matched: bool

def _skill_score(member_skills: list[dict[str, Any]], required_skill: str, required_level: int) -> tuple[float, bool]:
    skill_map = {s["skill"].lower(): s["level"] for s in member_skills}
    member_level = skill_map.get(required_skill.lower())
    if member_level is None:
        return 0.0, False
    ratio = min(member_level / required_level, 1.0)
    return round(SCORE_WEIGHT_SKILL * ratio, 2), True

def _workload_score(current_load_pct: float) -> float:
    remaining = 100.0 - current_load_pct
    if remaining >= 40:
        return float(SCORE_WEIGHT_WORKLOAD)
    elif remaining >= 20:
        return round(SCORE_WEIGHT_WORKLOAD * 0.6, 2)
    return round(SCORE_WEIGHT_WORKLOAD * 0.2, 2)

def _availability_score(available_hours: float, estimated_hours: float) -> float:
    if available_hours <= 0:
        return 0.0
    ratio = min(available_hours / estimated_hours, 1.0)
    return round(SCORE_WEIGHT_AVAILABILITY * ratio, 2)

def calculate_score(member_skills, available_hours, current_load_pct, required_skill, required_level, estimated_hours, priority) -> ScoreResult:
    skill_pts, matched = _skill_score(member_skills, required_skill, required_level)
    workload_pts = _workload_score(current_load_pct)
    availability_pts = _availability_score(available_hours, estimated_hours)
    base = skill_pts + workload_pts + availability_pts
    priority_pts = round(base * (PRIORITY_HIGH_MULTIPLIER - 1.0), 2) if priority == Priority.HIGH else 0.0
    adjusted = base * PRIORITY_HIGH_MULTIPLIER if priority == Priority.HIGH else base
    final_score = round(min(adjusted, 100.0), 2)
    breakdown = {"skill": skill_pts, "workload": workload_pts, "availability": availability_pts, "priority": priority_pts}
    return ScoreResult(score=final_score, breakdown=breakdown, skill_matched=matched)
