import uuid
from datetime import datetime
from pydantic import BaseModel, Field

class ProjectCreate(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    description: str | None = None
    workspace_id: uuid.UUID

class AddMemberToProject(BaseModel):
    user_id: uuid.UUID

class ProjectOut(BaseModel):
    id: uuid.UUID
    name: str
    description: str | None
    workspace_id: uuid.UUID
    created_by: uuid.UUID | None
    created_at: datetime
    model_config = {"from_attributes": True}
