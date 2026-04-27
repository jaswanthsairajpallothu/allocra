"""Task submission and review system + extended task status

Revision ID: 002_submissions
Revises: 001_initial
Create Date: 2026-04-26
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "002_submissions"
down_revision: Union[str, None] = "001_initial"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── 1. Extend taskstatus enum with new values ─────────────────────────
    # PostgreSQL requires adding enum values one at a time
    op.execute("ALTER TYPE taskstatus ADD VALUE IF NOT EXISTS 'IN_PROGRESS'")
    op.execute("ALTER TYPE taskstatus ADD VALUE IF NOT EXISTS 'SUBMITTED'")
    op.execute("ALTER TYPE taskstatus ADD VALUE IF NOT EXISTS 'REJECTED'")

    # ── 2. Create reviewdecision enum ─────────────────────────────────────
    op.execute(
        "CREATE TYPE reviewdecision AS ENUM ('APPROVED', 'REJECTED')"
    )

    # ── 3. task_submissions table ─────────────────────────────────────────
    op.create_table(
        "task_submissions",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("task_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("submitted_by", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("description", sa.Text, nullable=True),
        sa.Column("links", postgresql.JSON, nullable=False, server_default="[]"),
        sa.Column("files", postgresql.JSON, nullable=False, server_default="[]"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["task_id"], ["tasks.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["submitted_by"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_task_submissions_task_id", "task_submissions", ["task_id"])
    op.create_index("ix_task_submissions_submitted_by", "task_submissions", ["submitted_by"])

    # ── 4. task_reviews table ─────────────────────────────────────────────
    op.create_table(
        "task_reviews",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("submission_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("reviewed_by", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("decision", sa.Enum("APPROVED", "REJECTED", name="reviewdecision"), nullable=False),
        sa.Column("rating", sa.Integer, nullable=True),
        sa.Column("feedback", sa.Text, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["submission_id"], ["task_submissions.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["reviewed_by"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
        # One review per submission
        sa.UniqueConstraint("submission_id", name="uq_review_submission"),
    )


def downgrade() -> None:
    op.drop_table("task_reviews")
    op.drop_table("task_submissions")
    op.execute("DROP TYPE IF EXISTS reviewdecision")
    # Note: Cannot remove enum values from taskstatus in PostgreSQL without recreation
    # To fully downgrade: recreate the enum without IN_PROGRESS, SUBMITTED, REJECTED
