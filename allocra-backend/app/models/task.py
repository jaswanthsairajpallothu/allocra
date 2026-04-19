import uuid
from typing import TYPE_CHECKING
from sqlalchemy import Float, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.constants import Priority, TaskStatus
from app.db.base import Base, TimestampMixin, UUIDMixin
if TYPE_CHECKING:
    from app.models.project import Project
    from app.models.user import User
    from app.models.allocation import Allocation

class Task(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "tasks"
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    project_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    created_by: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    required_skill: Mapped[str] = mapped_column(String(100), nullable=False)
    required_level: Mapped[int] = mapped_column(Integer, nullable=False)
    estimated_hours: Mapped[float] = mapped_column(Float, nullable=False)
    priority: Mapped[Priority] = mapped_column(String(10), nullable=False, default=Priority.MEDIUM)
    status: Mapped[TaskStatus] = mapped_column(String(20), nullable=False, default=TaskStatus.PENDING)
    project: Mapped["Project"] = relationship("Project", back_populates="tasks")
    creator: Mapped["User | None"] = relationship("User")
    allocation: Mapped["Allocation | None"] = relationship("Allocation", back_populates="task", uselist=False)
