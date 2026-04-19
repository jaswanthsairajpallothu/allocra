import uuid
from typing import TYPE_CHECKING
from sqlalchemy import String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base, TimestampMixin, UUIDMixin
if TYPE_CHECKING:
    from app.models.workspace import Workspace, WorkspaceMember
    from app.models.project import Project
    from app.models.membership import Membership

class User(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "users"
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    created_workspaces: Mapped[list["Workspace"]] = relationship("Workspace", back_populates="creator", foreign_keys="Workspace.created_by")
    workspace_memberships: Mapped[list["WorkspaceMember"]] = relationship("WorkspaceMember", back_populates="user")
    project_memberships: Mapped[list["Membership"]] = relationship("Membership", back_populates="user")
    created_projects: Mapped[list["Project"]] = relationship("Project", back_populates="creator")
