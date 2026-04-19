import pytest
from app.allocator.scoring import calculate_score
from app.core.constants import Priority

def _skills(skill, level): return [{"skill": skill, "level": level}]

class TestSkillFactor:
    def test_exact_match_scores_full_skill_weight(self):
        r = calculate_score(_skills("Python",4), 40, 10, "Python", 4, 8, Priority.MEDIUM)
        assert r.breakdown["skill"] == 40.0

    def test_under_level_gives_partial_score(self):
        r = calculate_score(_skills("Python",2), 40, 10, "Python", 4, 8, Priority.MEDIUM)
        assert r.breakdown["skill"] == 20.0
        assert r.skill_matched is True

    def test_missing_skill_gives_zero(self):
        r = calculate_score(_skills("Java",5), 40, 10, "Python", 3, 8, Priority.MEDIUM)
        assert r.breakdown["skill"] == 0.0
        assert r.skill_matched is False

    def test_case_insensitive_match(self):
        r = calculate_score(_skills("python",3), 40, 10, "Python", 3, 8, Priority.MEDIUM)
        assert r.skill_matched is True

class TestWorkloadFactor:
    def test_low_load_full_workload_score(self):
        r = calculate_score(_skills("Python",4), 40, 20, "Python", 4, 8, Priority.MEDIUM)
        assert r.breakdown["workload"] == 25.0

    def test_high_load_reduced_workload_score(self):
        r = calculate_score(_skills("Python",4), 40, 70, "Python", 4, 8, Priority.MEDIUM)
        assert r.breakdown["workload"] == pytest.approx(15.0)

    def test_near_full_load_minimal_workload_score(self):
        r = calculate_score(_skills("Python",4), 40, 90, "Python", 4, 8, Priority.MEDIUM)
        assert r.breakdown["workload"] == pytest.approx(5.0)

class TestAvailabilityFactor:
    def test_sufficient_hours_full_score(self):
        r = calculate_score(_skills("Python",4), 20, 20, "Python", 4, 10, Priority.MEDIUM)
        assert r.breakdown["availability"] == 20.0

    def test_partial_hours_proportional_score(self):
        r = calculate_score(_skills("Python",4), 5, 20, "Python", 4, 10, Priority.MEDIUM)
        assert r.breakdown["availability"] == pytest.approx(10.0)

class TestPriorityFactor:
    def test_high_priority_inflates_score(self):
        med = calculate_score(_skills("Python",4), 40, 20, "Python", 4, 8, Priority.MEDIUM)
        hi  = calculate_score(_skills("Python",4), 40, 20, "Python", 4, 8, Priority.HIGH)
        assert hi.score > med.score
        assert hi.breakdown["priority"] > 0

    def test_low_priority_no_multiplier(self):
        r = calculate_score(_skills("Python",4), 40, 20, "Python", 4, 8, Priority.LOW)
        assert r.breakdown["priority"] == 0.0

class TestScoreCap:
    def test_score_never_exceeds_100(self):
        r = calculate_score(_skills("Python",5), 100, 0, "Python", 1, 1, Priority.HIGH)
        assert r.score <= 100.0
