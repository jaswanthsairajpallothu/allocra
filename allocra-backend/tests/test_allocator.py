import uuid
from unittest.mock import MagicMock
import pytest
from app.allocator.allocator import run_allocation
from app.core.constants import Priority, TaskStatus

PROJECT_ID = uuid.uuid4()
USER_A = uuid.uuid4()
USER_B = uuid.uuid4()

def _member(user_id, skills, hours):
    m = MagicMock(); m.id = uuid.uuid4(); m.user_id = user_id
    m.skills = skills; m.available_hours = hours; m.project_id = PROJECT_ID
    return m

def _task(skill, level, hours, priority=Priority.MEDIUM):
    t = MagicMock(); t.id = uuid.uuid4(); t.title = f"Task-{skill}"
    t.project_id = PROJECT_ID; t.required_skill = skill; t.required_level = level
    t.estimated_hours = hours; t.priority = priority; t.status = TaskStatus.PENDING
    return t

class TestBasicAllocation:
    def test_best_skilled_member_assigned(self):
        tasks = [_task("Python", 3, 8)]
        members = [_member(USER_A, [{"skill":"Python","level":5}], 40), _member(USER_B, [{"skill":"Java","level":5}], 40)]
        r = run_allocation(tasks, members, {USER_A:"Alice", USER_B:"Bob"}, {})
        assert len(r.assignments) == 1
        assert r.assignments[0].assigned_to_user_id == USER_A

    def test_empty_members_all_unassigned(self):
        tasks = [_task("Python", 3, 8)]
        r = run_allocation(tasks, [], {}, {})
        assert len(r.unassigned_tasks) == 1
        assert len(r.assignments) == 0

class TestWorkloadAccumulation:
    def test_load_increases_across_tasks(self):
        member = _member(USER_A, [{"skill":"Python","level":5}], 40)
        tasks = [_task("Python", 3, 10), _task("Python", 3, 10)]
        r = run_allocation(tasks, [member], {USER_A:"Alice"}, {})
        assert len(r.assignments) == 2
        assert r.assignments[1].workload_after > r.assignments[0].workload_after

class TestHighPriorityFirst:
    def test_high_priority_assigned_before_low(self):
        member = _member(USER_A, [{"skill":"Python","level":5}], 40)
        hi = _task("Python", 3, 5, Priority.HIGH)
        lo = _task("Python", 3, 5, Priority.LOW)
        r = run_allocation([lo, hi], [member], {USER_A:"Alice"}, {})
        assert len(r.assignments) == 2
        assert r.assignments[0].task_id == hi.id

class TestSystemInsights:
    def test_skill_gap_detected(self):
        tasks = [_task("Docker", 3, 5)]
        members = [_member(USER_A, [{"skill":"Python","level":5}], 40)]
        r = run_allocation(tasks, members, {USER_A:"Alice"}, {})
        assert any(i.type == "SKILL_GAP" for i in r.system_insights)

    def test_dependency_risk_single_skill_owner(self):
        tasks = [_task("React", 3, 5)]
        members = [_member(USER_A, [{"skill":"React","level":4}], 40)]
        r = run_allocation(tasks, members, {USER_A:"Alice"}, {})
        assert any(i.type == "DEPENDENCY_RISK" for i in r.system_insights)
