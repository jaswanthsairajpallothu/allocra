from dataclasses import dataclass
from app.core.constants import LOAD_WARNING_THRESHOLD, RISK_LOW_THRESHOLD, RISK_MEDIUM_THRESHOLD, RiskLevel

_RISK_SKILL_MISMATCH = 40
_RISK_OVERLOAD = 30
_RISK_AVAILABILITY = 30

@dataclass(frozen=True)
class RiskResult:
    risk_score: float
    risk_level: RiskLevel
    reasons: list[str]

def calculate_risk(skill_matched, member_level, required_level, current_load_pct, available_hours, estimated_hours) -> RiskResult:
    raw_risk = 0.0
    reasons: list[str] = []
    if not skill_matched:
        raw_risk += _RISK_SKILL_MISMATCH
        reasons.append("Required skill not present in member profile")
    elif member_level is not None and member_level < required_level:
        level_gap = required_level - member_level
        partial = round(_RISK_SKILL_MISMATCH * (level_gap / required_level), 2)
        raw_risk += partial
        reasons.append(f"Skill level below requirement (has {member_level}, needs {required_level})")
    if current_load_pct > LOAD_WARNING_THRESHOLD:
        raw_risk += _RISK_OVERLOAD
        reasons.append(f"Member overloaded ({current_load_pct:.0f}% load)")
    if available_hours < estimated_hours:
        shortfall_ratio = 1 - (available_hours / max(estimated_hours, 0.01))
        partial = round(_RISK_AVAILABILITY * min(shortfall_ratio, 1.0), 2)
        raw_risk += partial
        reasons.append(f"Insufficient hours (available {available_hours:.1f}h, need {estimated_hours:.1f}h)")
    final_risk = round(min(raw_risk, 100.0), 2)
    if final_risk <= RISK_LOW_THRESHOLD:
        level = RiskLevel.LOW
    elif final_risk <= RISK_MEDIUM_THRESHOLD:
        level = RiskLevel.MEDIUM
    else:
        level = RiskLevel.HIGH
    return RiskResult(risk_score=final_risk, risk_level=level, reasons=reasons)
