import uuid
from datetime import datetime
from pydantic import BaseModel, Field
from app.core.constants import Priority, TaskStatus

class TaskCreate(BaseModel):
    title: str = Field(min_length=2, max_length=200)
    description: str | None = None
    project_id: uuid.UUID
    required_skill: str = Field(min_length=1, max_length=100)
    required_level: int = Field(ge=1, le=5)
    estimated_hours: float = Field(gt=0, le=500)
    priority: Priority = Priority.MEDIUM

class TaskUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=2, max_length=200)
    description: str | None = None
    required_skill: str | None = Field(default=None, min_length=1, max_length=100)
    required_level: int | None = Field(default=None, ge=1, le=5)
    estimated_hours: float | None = Field(default=None, gt=0, le=500)
    priority: Priority | None = None

class TaskOut(BaseModel):
    id: uuid.UUID
    title: str
    description: str | None
    project_id: uuid.UUID
    required_skill: str
    required_level: int
    estimated_hours: float
    priority: Priority
    status: TaskStatus
    created_at: datetime
    model_config = {"from_attributes": True}
