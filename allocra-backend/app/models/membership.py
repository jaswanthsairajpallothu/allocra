import uuid
from typing import TYPE_CHECKING, Any
from sqlalchemy import Float, ForeignKey, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base, TimestampMixin, UUIDMixin
if TYPE_CHECKING:
    from app.models.user import User
    from app.models.project import Project
    from app.models.allocation import Allocation

class Membership(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "memberships"
    __table_args__ = (UniqueConstraint("user_id", "project_id", name="uq_membership_user_project"),)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    project_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    skills: Mapped[list[dict[str, Any]]] = mapped_column(JSONB, nullable=False, default=list)
    available_hours: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    user: Mapped["User"] = relationship("User", back_populates="project_memberships")
    project: Mapped["Project"] = relationship("Project", back_populates="memberships")
    allocations: Mapped[list["Allocation"]] = relationship("Allocation", back_populates="member")
