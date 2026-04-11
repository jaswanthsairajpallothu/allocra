from pydantic import BaseModel, Field
from typing import List

class SkillSchema(BaseModel):
    skill_name: str
    level: int = Field(ge=1, le=5)

class UserCreateSchema(BaseModel):
    name: str
    available_hours: float = Field(gt=0)
    skills: List[SkillSchema]

class UserResponseSchema(BaseModel):
    id: int
    name: str
    available_hours: float
    skills: List[SkillSchema]

    model_config = {"from_attributes": True}
