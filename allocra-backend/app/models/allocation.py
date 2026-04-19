import uuid
from typing import TYPE_CHECKING, Any
from sqlalchemy import Float, ForeignKey, String
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base, TimestampMixin, UUIDMixin
if TYPE_CHECKING:
    from app.models.task import Task
    from app.models.membership import Membership
    from app.models.project import Project

class Allocation(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "allocations"
    run_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    project_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    task_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False, unique=True)
    membership_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("memberships.id", ondelete="CASCADE"), nullable=False, index=True)
    score: Mapped[float] = mapped_column(Float, nullable=False)
    score_breakdown: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False)
    risk_score: Mapped[float] = mapped_column(Float, nullable=False)
    risk_level: Mapped[str] = mapped_column(String(10), nullable=False)
    risk_reasons: Mapped[list[str]] = mapped_column(JSONB, nullable=False, default=list)
    workload_after: Mapped[float] = mapped_column(Float, nullable=False)
    task: Mapped["Task"] = relationship("Task", back_populates="allocation")
    member: Mapped["Membership"] = relationship("Membership", back_populates="allocations")
    project: Mapped["Project"] = relationship("Project")
