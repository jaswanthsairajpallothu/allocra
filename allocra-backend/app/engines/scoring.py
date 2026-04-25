"""
Allocra Intelligence Engines

Scoring Engine (all plans — basic, Pro adds breakdown display):
  - Skill Match:      40 pts
  - Workload Impact:  25 pts
  - Availability Fit: 20 pts
  - Priority bonus:   ×1.1 on HIGH (cap 100)

Risk Engine (Team plan — but calculated for all, displayed for Team):
  - Skill Risk:       40 pts
  - Overload Risk:    30 pts
  - Availability Risk:30 pts
  LOW: 0-30 | MEDIUM: 31-70 | HIGH: 71-100

Workload Optimization (Team):
  - Suggests re-assignments when OVERLOAD+SAFE pairs exist
"""

from __future__ import annotations
from typing import List, Optional, Dict, Any
from uuid import UUID
from dataclasses import dataclass, field


@dataclass
class MemberSnapshot:
    membership_id: UUID
    user_id: UUID
    name: str
    skills: List[Dict]  # [{"name": "Python", "level": 4}]
    available_hours: float
    assigned_hours: float  # running total during allocation

    @property
    def load_percent(self) -> float:
        if self.available_hours <= 0:
            return 100.0
        return min(100.0, (self.assigned_hours / self.available_hours) * 100)

    @property
    def remaining_capacity_percent(self) -> float:
        return 100.0 - self.load_percent

    def has_skill(self, skill_name: str) -> bool:
        return any(s["name"].lower() == skill_name.lower() for s in self.skills)

    def skill_level(self, skill_name: str) -> int:
        for s in self.skills:
            if s["name"].lower() == skill_name.lower():
                return int(s.get("level", 1))
        return 0


@dataclass
class TaskSnapshot:
    task_id: UUID
    title: str
    required_skill: str
    required_level: int
    estimated_hours: float
    priority: str  # LOW|MEDIUM|HIGH


@dataclass
class ScoreBreakdown:
    skill: float
    workload: float
    availability: float
    priority_bonus: float

    @property
    def total(self) -> float:
        return min(100.0, self.skill + self.workload + self.availability + self.priority_bonus)


@dataclass
class RiskResult:
    score: float
    level: str
    reasons: List[str]


@dataclass
class AssignmentDecision:
    task: TaskSnapshot
    member: Optional[MemberSnapshot]
    score: float
    breakdown: ScoreBreakdown
    risk: RiskResult
    load_after: float
    assigned: bool
    unassigned_reason: Optional[str] = None


def _score_candidate(task: TaskSnapshot, member: MemberSnapshot) -> ScoreBreakdown:
    # Skill Match (40 pts)
    if task.required_level == 0:
        skill_score = 0.0
    elif member.has_skill(task.required_skill):
        ml = member.skill_level(task.required_skill)
        skill_score = min(40.0, 40.0 * (ml / task.required_level))
    else:
        skill_score = 0.0

    # Workload Impact (25 pts)
    remaining = member.remaining_capacity_percent
    if remaining > 40:
        workload_score = 25.0
    elif remaining >= 20:
        workload_score = 15.0
    else:
        workload_score = 5.0

    # Availability Fit (20 pts)
    remaining_hours = member.available_hours - member.assigned_hours
    if remaining_hours >= task.estimated_hours:
        availability_score = 20.0
    elif remaining_hours > 0:
        availability_score = max(0.0, 20.0 * (remaining_hours / task.estimated_hours))
    else:
        availability_score = 0.0

    # Priority Multiplier
    base = skill_score + workload_score + availability_score
    priority_bonus = 0.0
    if task.priority == "HIGH":
        bonus = base * 0.1
        priority_bonus = bonus

    return ScoreBreakdown(
        skill=round(skill_score, 2),
        workload=round(workload_score, 2),
        availability=round(availability_score, 2),
        priority_bonus=round(priority_bonus, 2),
    )


def _calculate_risk(task: TaskSnapshot, member: MemberSnapshot) -> RiskResult:
    score = 0.0
    reasons: List[str] = []

    # Skill Risk (40 pts)
    ml = member.skill_level(task.required_skill)
    if ml == 0:
        score += 40
        reasons.append(f"Member lacks required skill: {task.required_skill}")
    elif ml < task.required_level:
        partial = 40 * ((task.required_level - ml) / task.required_level)
        score += partial
        reasons.append(f"Skill level {ml} below required {task.required_level}")

    # Overload Risk (30 pts)
    if member.load_percent > 85:
        score += 30
        reasons.append(f"Member is at {member.load_percent:.0f}% capacity (OVERLOAD threshold)")
    elif member.load_percent > 60:
        score += 15
        reasons.append(f"Member is at {member.load_percent:.0f}% capacity (WARNING)")

    # Availability Risk (30 pts)
    remaining_hours = member.available_hours - member.assigned_hours
    if remaining_hours < task.estimated_hours:
        score += 30
        reasons.append(
            f"Available hours ({remaining_hours:.1f}h) below task estimate ({task.estimated_hours}h)"
        )

    score = min(100.0, score)

    if score <= 30:
        level = "LOW"
    elif score <= 70:
        level = "MEDIUM"
    else:
        level = "HIGH"

    return RiskResult(score=round(score, 2), level=level, reasons=reasons)


def run_allocation(
    tasks: List[TaskSnapshot],
    members: List[MemberSnapshot],
) -> List[AssignmentDecision]:
    """
    Core allocation algorithm.
    For each PENDING task, find the best-scoring eligible member.
    Mutates member.assigned_hours to track load accumulation across tasks.
    Tasks processed in priority order: HIGH → MEDIUM → LOW.
    """
    priority_order = {"HIGH": 0, "MEDIUM": 1, "LOW": 2}
    sorted_tasks = sorted(tasks, key=lambda t: priority_order.get(t.priority, 1))

    decisions: List[AssignmentDecision] = []

    for task in sorted_tasks:
        best_score = -1.0
        best_member: Optional[MemberSnapshot] = None
        best_breakdown: Optional[ScoreBreakdown] = None
        best_risk: Optional[RiskResult] = None

        for member in members:
            breakdown = _score_candidate(task, member)
            total = breakdown.total

            if total > best_score:
                best_score = total
                best_member = member
                best_breakdown = breakdown
                best_risk = _calculate_risk(task, member)

        if best_member is None or best_score < 1.0:
            # No viable candidate
            decisions.append(
                AssignmentDecision(
                    task=task,
                    member=None,
                    score=0.0,
                    breakdown=ScoreBreakdown(0, 0, 0, 0),
                    risk=RiskResult(100.0, "HIGH", ["No available team member for this skill"]),
                    load_after=0.0,
                    assigned=False,
                    unassigned_reason="No team member has the required skill or capacity",
                )
            )
            continue

        # Commit the assignment: update member's running hours
        best_member.assigned_hours += task.estimated_hours
        load_after = round(best_member.load_percent, 1)

        decisions.append(
            AssignmentDecision(
                task=task,
                member=best_member,
                score=round(best_breakdown.total, 2),
                breakdown=best_breakdown,
                risk=best_risk,
                load_after=load_after,
                assigned=True,
            )
        )

    return decisions


def generate_optimization_suggestions(
    decisions: List[AssignmentDecision],
    members: List[MemberSnapshot],
) -> List[Dict]:
    """
    Find OVERLOAD→SAFE re-assignment opportunities.
    Only for ASSIGNED decisions (not unassigned tasks).
    """
    suggestions = []
    overloaded = [m for m in members if m.load_percent > 85]
    safe = [m for m in members if m.load_percent < 60]

    if not overloaded or not safe:
        return suggestions

    for decision in decisions:
        if not decision.assigned or decision.member is None:
            continue
        if decision.member.load_percent <= 85:
            continue

        # See if any SAFE member can take this task
        for safe_member in safe:
            if safe_member.has_skill(decision.task.required_skill):
                sl = safe_member.skill_level(decision.task.required_skill)
                if sl >= decision.task.required_level:
                    suggestions.append({
                        "task_id": str(decision.task.task_id),
                        "task_title": decision.task.title,
                        "from_user": decision.member.name,
                        "to_user": safe_member.name,
                        "reason": (
                            f"{decision.member.name} is at "
                            f"{decision.member.load_percent:.0f}% capacity; "
                            f"{safe_member.name} is at {safe_member.load_percent:.0f}%"
                        ),
                    })
                    break  # one suggestion per overloaded task

    return suggestions


def generate_system_insights(
    tasks: List[TaskSnapshot],
    members: List[MemberSnapshot],
    decisions: List[AssignmentDecision],
) -> List[Dict]:
    insights = []

    # UNASSIGNED
    unassigned_count = sum(1 for d in decisions if not d.assigned)
    if unassigned_count > 0:
        insights.append({
            "type": "UNASSIGNED",
            "message": f"{unassigned_count} task(s) could not be assigned — no matching skill/capacity.",
            "severity": "red",
        })

    # SKILL_GAP — required skills no member has
    all_member_skills = set()
    for m in members:
        for s in m.skills:
            all_member_skills.add(s["name"].lower())

    required_skills = {t.required_skill.lower() for t in tasks}
    gaps = required_skills - all_member_skills
    for skill in gaps:
        insights.append({
            "type": "SKILL_GAP",
            "message": f"No team member has skill '{skill.title()}' — tasks requiring it cannot be assigned.",
            "severity": "red",
        })

    # DEPENDENCY_RISK — only 1 member has a critical skill
    skill_holder_count: Dict[str, int] = {}
    for m in members:
        for s in m.skills:
            sn = s["name"].lower()
            skill_holder_count[sn] = skill_holder_count.get(sn, 0) + 1

    for skill, count in skill_holder_count.items():
        if count == 1 and skill in required_skills:
            insights.append({
                "type": "DEPENDENCY_RISK",
                "message": f"Only 1 member has skill '{skill.title()}' — single point of failure.",
                "severity": "amber",
            })

    return insights
