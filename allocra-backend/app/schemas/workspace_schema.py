import uuid
from datetime import datetime
from pydantic import BaseModel, Field

class WorkspaceCreate(BaseModel):
    name: str = Field(min_length=2, max_length=100)

class WorkspaceJoin(BaseModel):
    join_code: str = Field(min_length=6, max_length=10)

class WorkspaceOut(BaseModel):
    id: uuid.UUID
    name: str
    join_code: str
    created_by: uuid.UUID | None
    created_at: datetime
    model_config = {"from_attributes": True}

class WorkspaceInviteOut(BaseModel):
    join_code: str
    message: str = "Share this code with your team members"
