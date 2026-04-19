import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone
from app.allocator.filters import filter_candidates
from app.allocator.risk import RiskResult, calculate_risk
from app.allocator.scoring import ScoreResult, calculate_score
from app.allocator.utils import classify_load, compute_load_pct, get_member_skill_level
from app.core.constants import LOAD_SAFE_THRESHOLD, LOAD_WARNING_THRESHOLD
from app.models.membership import Membership
from app.models.task import Task
from app.schemas.allocation_schema import (
    AllocationRunOut, RiskDetail, ScoreBreakdown, SystemInsight,
    TaskAllocationResult, WorkloadOptimizationSuggestion,
)

@dataclass
class _MemberState:
    membership: Membership
    user_name: str
    assigned_hours: float = 0.0
    assigned_tasks: list[str] = field(default_factory=list)

    @property
    def load_pct(self) -> float:
        return compute_load_pct(self.assigned_hours, self.membership.available_hours)

def run_allocation(tasks, memberships, user_name_map, existing_assigned_hours) -> AllocationRunOut:
    run_id = uuid.uuid4()
    now = datetime.now(timezone.utc)
    member_states: dict[uuid.UUID, _MemberState] = {
        m.id: _MemberState(membership=m, user_name=user_name_map.get(m.user_id, "Unknown"),
                           assigned_hours=existing_assigned_hours.get(m.id, 0.0))
        for m in memberships
    }
    assignments: list[TaskAllocationResult] = []
    unassigned: list[dict] = []
    sorted_tasks = sorted(tasks, key=lambda t: (0 if t.priority == "HIGH" else (1 if t.priority == "MEDIUM" else 2), -t.estimated_hours))

    for task in sorted_tasks:
        candidates = filter_candidates(task, memberships)
        if not candidates:
            unassigned.append({"task_id": str(task.id), "title": task.title, "reason": "No members with available capacity"})
            continue
        best_member_id = None
        best_score_result = None
        best_risk_result = None
        for membership in candidates:
            state = member_states[membership.id]
            score_result = calculate_score(
                member_skills=membership.skills,
                available_hours=membership.available_hours - state.assigned_hours,
                current_load_pct=state.load_pct,
                required_skill=task.required_skill,
                required_level=task.required_level,
                estimated_hours=task.estimated_hours,
                priority=task.priority,
            )
            member_level = get_member_skill_level(membership.skills, task.required_skill)
            remaining_hours = membership.available_hours - state.assigned_hours
            risk_result = calculate_risk(
                skill_matched=score_result.skill_matched,
                member_level=member_level,
                required_level=task.required_level,
                current_load_pct=state.load_pct,
                available_hours=remaining_hours,
                estimated_hours=task.estimated_hours,
            )
            if best_score_result is None or score_result.score > best_score_result.score:
                best_member_id = membership.id
                best_score_result = score_result
                best_risk_result = risk_result
        if best_member_id is None:
            unassigned.append({"task_id": str(task.id), "title": task.title, "reason": "No suitable candidate after scoring"})
            continue
        state = member_states[best_member_id]
        state.assigned_hours += task.estimated_hours
        state.assigned_tasks.append(task.title)
        assignments.append(TaskAllocationResult(
            task_id=task.id, task_title=task.title,
            assigned_to_user_id=state.membership.user_id, assigned_to_name=state.user_name,
            score=best_score_result.score,
            score_breakdown=ScoreBreakdown(**best_score_result.breakdown),
            risk=RiskDetail(risk_score=best_risk_result.risk_score, risk_level=best_risk_result.risk_level, reasons=best_risk_result.reasons),
            workload_after=round(state.load_pct, 2),
        ))

    return AllocationRunOut(
        run_id=run_id,
        project_id=tasks[0].project_id if tasks else uuid.uuid4(),
        assignments=assignments,
        unassigned_tasks=unassigned,
        optimization_suggestions=_generate_optimization_suggestions(member_states),
        system_insights=_generate_system_insights(memberships, tasks, unassigned),
        created_at=now,
    )

def _generate_optimization_suggestions(member_states):
    overloaded = [s for s in member_states.values() if s.load_pct > LOAD_WARNING_THRESHOLD and s.assigned_tasks]
    underutilized = [s for s in member_states.values() if s.load_pct < LOAD_SAFE_THRESHOLD]
    suggestions = []
    for over in overloaded:
        for under in underutilized:
            if not over.assigned_tasks:
                break
            task_to_move = over.assigned_tasks[-1]
            suggestions.append(WorkloadOptimizationSuggestion(
                suggestion=f"Move '{task_to_move}' from {over.user_name} → {under.user_name}",
                reason=f"{over.user_name} is overloaded ({over.load_pct:.0f}%), {under.user_name} is underutilized ({under.load_pct:.0f}%)",
                from_user=over.user_name, to_user=under.user_name, task_title=task_to_move,
            ))
    return suggestions

def _generate_system_insights(memberships, tasks, unassigned):
    insights = []
    if unassigned:
        insights.append(SystemInsight(type="UNASSIGNED", message=f"{len(unassigned)} task(s) could not be assigned — check team capacity or skill coverage"))
    all_skills: dict[str, int] = {}
    for m in memberships:
        for s in m.skills:
            key = s["skill"].lower()
            all_skills[key] = all_skills.get(key, 0) + 1
    required_skills = {t.required_skill.lower() for t in tasks}
    for skill in required_skills:
        if skill not in all_skills:
            insights.append(SystemInsight(type="SKILL_GAP", message=f"No team member has the required skill: '{skill.title()}'"))
    for skill, count in all_skills.items():
        if count == 1 and skill in required_skills:
            insights.append(SystemInsight(type="DEPENDENCY_RISK", message=f"Only 1 member has '{skill.title()}' — high single-point dependency risk"))
    return insights
