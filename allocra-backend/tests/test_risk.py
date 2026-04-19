import pytest
from app.allocator.risk import calculate_risk
from app.core.constants import RiskLevel

class TestSkillRisk:
    def test_missing_skill_raises_max_skill_risk(self):
        r = calculate_risk(False, None, 3, 30, 20, 8)
        assert r.risk_score >= 40
        assert any("skill" in x.lower() for x in r.reasons)

    def test_under_levelled_gives_partial_risk(self):
        r = calculate_risk(True, 2, 4, 30, 20, 8)
        assert 0 < r.risk_score < 40
        assert any("level" in x.lower() for x in r.reasons)

    def test_exact_level_no_skill_risk(self):
        r = calculate_risk(True, 4, 4, 30, 20, 8)
        assert r.risk_score == 0.0

class TestOverloadRisk:
    def test_overloaded_triggers_risk(self):
        r = calculate_risk(True, 4, 4, 90, 20, 8)
        assert r.risk_score >= 30

    def test_safe_load_no_risk(self):
        r = calculate_risk(True, 4, 4, 40, 20, 8)
        assert r.risk_score == 0.0

class TestAvailabilityRisk:
    def test_insufficient_hours_triggers_risk(self):
        r = calculate_risk(True, 4, 4, 30, 3, 10)
        assert r.risk_score > 0

    def test_sufficient_hours_no_risk(self):
        r = calculate_risk(True, 4, 4, 30, 20, 8)
        assert r.risk_score == 0.0

class TestRiskLevelClassification:
    def test_zero_risk_is_low(self):
        r = calculate_risk(True, 4, 4, 30, 20, 8)
        assert r.risk_level == RiskLevel.LOW

    def test_all_factors_is_high(self):
        r = calculate_risk(False, None, 4, 90, 2, 10)
        assert r.risk_level == RiskLevel.HIGH

    def test_risk_capped_at_100(self):
        r = calculate_risk(False, None, 5, 100, 0, 40)
        assert r.risk_score <= 100.0
