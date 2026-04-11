from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class TaskCreateSchema(BaseModel):
    title: str
    required_skill: str
    difficulty: float = Field(gt=0)
    priority: int = Field(ge=1, le=5)
    deadline: Optional[datetime] = None

class TaskResponseSchema(BaseModel):
    id: int
    title: str
    required_skill: str
    difficulty: float
    priority: int
    deadline: Optional[datetime] = None

    model_config = {"from_attributes": True}
