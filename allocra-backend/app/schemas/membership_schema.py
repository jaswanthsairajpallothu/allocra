import uuid
from datetime import datetime
from typing import Any
from pydantic import BaseModel, Field, field_validator
from app.core.constants import SKILL_LEVEL_MAX, SKILL_LEVEL_MIN, LoadStatus

class SkillEntry(BaseModel):
    skill: str = Field(min_length=1, max_length=80)
    level: int = Field(ge=SKILL_LEVEL_MIN, le=SKILL_LEVEL_MAX)

class MembershipSkillsUpdate(BaseModel):
    skills: list[SkillEntry]
    @field_validator("skills")
    @classmethod
    def no_duplicate_skills(cls, v: list[SkillEntry]) -> list[SkillEntry]:
        names = [s.skill.lower() for s in v]
        if len(names) != len(set(names)):
            raise ValueError("Duplicate skill entries are not allowed")
        return v

class MembershipAvailabilityUpdate(BaseModel):
    available_hours: float = Field(gt=0, le=500)

class MembershipOut(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    project_id: uuid.UUID
    skills: list[dict[str, Any]]
    available_hours: float
    created_at: datetime
    model_config = {"from_attributes": True}

class MemberLoadOut(BaseModel):
    membership_id: uuid.UUID
    user_id: uuid.UUID
    user_name: str
    load_pct: float
    assigned_hours: float
    available_hours: float
    status: LoadStatus
    skills: list[dict[str, Any]]
