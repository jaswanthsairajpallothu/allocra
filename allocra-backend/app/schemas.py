from __future__ import annotations
from uuid import UUID
from datetime import datetime
from typing import Optional, List, Any, Dict
from pydantic import BaseModel, EmailStr, field_validator, model_validator
from app.models import PlanTier, TaskPriority, TaskStatus, RiskLevel, LoadStatus, NotificationType


# ────────────── AUTH ──────────────
class ClerkWebhookUser(BaseModel):
    clerk_user_id: str
    email: str
    name: str
    avatar_url: Optional[str] = None


class UserOut(BaseModel):
    id: UUID
    email: str
    name: str
    display_id: str
    avatar_url: Optional[str]
    plan_tier: PlanTier
    onboarding_step: int
    onboarding_complete: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class OnboardingUpdate(BaseModel):
    step: int
    complete: Optional[bool] = None


# ────────────── WORKSPACE ──────────────
class WorkspaceCreate(BaseModel):
    name: str

    @field_validator("name")
    @classmethod
    def name_not_empty(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Workspace name cannot be empty")
        return v


class WorkspaceUpdate(BaseModel):
    name: Optional[str] = None


class WorkspaceMemberOut(BaseModel):
    id: UUID
    user_id: UUID
    name: str
    email: str
    display_id: str
    avatar_url: Optional[str]
    is_admin: bool
    joined_at: datetime
    last_active_at: Optional[datetime]

    model_config = {"from_attributes": True}


class WorkspaceOut(BaseModel):
    id: UUID
    name: str
    join_code: str
    creator_id: Optional[UUID]
    member_count: int
    project_count: int
    created_at: datetime

    model_config = {"from_attributes": True}


class JoinWorkspace(BaseModel):
    join_code: str

    @field_validator("join_code")
    @classmethod
    def normalize(cls, v: str) -> str:
        return v.strip().upper()


# ────────────── PROJECT ──────────────
class ProjectCreate(BaseModel):
    workspace_id: UUID
    name: str
    description: Optional[str] = None


class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None


class ProjectOut(BaseModel):
    id: UUID
    workspace_id: UUID
    name: str
    description: Optional[str]
    is_archived: bool
    member_count: int
    task_count: int
    created_at: datetime

    model_config = {"from_attributes": True}


class AddProjectMember(BaseModel):
    display_id: str

    @field_validator("display_id")
    @classmethod
    def normalize(cls, v: str) -> str:
        return v.strip().upper()


# ────────────── MEMBERSHIP ──────────────
class SkillEntry(BaseModel):
    name: str
    level: int  # 1-5

    @field_validator("level")
    @classmethod
    def level_range(cls, v: int) -> int:
        if not 1 <= v <= 5:
            raise ValueError("Skill level must be between 1 and 5")
        return v


class MembershipSkillsUpdate(BaseModel):
    skills: List[SkillEntry]


class MembershipAvailabilityUpdate(BaseModel):
    available_hours: float

    @field_validator("available_hours")
    @classmethod
    def positive(cls, v: float) -> float:
        if v < 0:
            raise ValueError("available_hours cannot be negative")
        return v


class ProjectMemberOut(BaseModel):
    id: UUID
    user_id: UUID
    name: str
    email: str
    display_id: str
    avatar_url: Optional[str]
    skills: List[SkillEntry]
    available_hours: float
    assigned_hours: float
    load_percent: float
    load_status: LoadStatus
    joined_at: datetime

    model_config = {"from_attributes": True}


# ────────────── TASK ──────────────
class TaskCreate(BaseModel):
    project_id: UUID
    title: str
    description: Optional[str] = None
    required_skill: str
    required_level: int
    estimated_hours: float
    priority: TaskPriority = TaskPriority.MEDIUM

    @field_validator("required_level")
    @classmethod
    def level_range(cls, v: int) -> int:
        if not 1 <= v <= 5:
            raise ValueError("required_level must be 1-5")
        return v

    @field_validator("estimated_hours")
    @classmethod
    def positive_hours(cls, v: float) -> float:
        if v <= 0:
            raise ValueError("estimated_hours must be positive")
        return v


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    required_skill: Optional[str] = None
    required_level: Optional[int] = None
    estimated_hours: Optional[float] = None
    priority: Optional[TaskPriority] = None
    status: Optional[TaskStatus] = None


class TaskOut(BaseModel):
    id: UUID
    project_id: UUID
    title: str
    description: Optional[str]
    required_skill: str
    required_level: int
    estimated_hours: float
    priority: TaskPriority
    status: TaskStatus
    assigned_to: Optional[UUID]
    assignee_name: Optional[str]
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# ────────────── ALLOCATION ──────────────
class ScoreBreakdown(BaseModel):
    skill: float
    workload: float
    availability: float
    priority_bonus: float


class AssignmentResult(BaseModel):
    task_id: UUID
    task_title: str
    assigned_to_user_id: Optional[UUID]
    assigned_to_name: Optional[str]
    score: float
    breakdown: ScoreBreakdown
    risk_score: float
    risk_level: RiskLevel
    risk_reasons: List[str]
    load_after: float


class OptimizationSuggestion(BaseModel):
    task_id: UUID
    task_title: str
    from_user: str
    to_user: str
    reason: str


class SystemInsight(BaseModel):
    type: str  # SKILL_GAP | DEPENDENCY_RISK | UNASSIGNED
    message: str
    severity: str  # red | amber


class AllocationResult(BaseModel):
    run_id: UUID
    project_id: UUID
    assigned: int
    unassigned: int
    total_tasks: int
    avg_score: float
    assignments: List[AssignmentResult]
    unassigned_tasks: List[Dict[str, Any]]
    optimization_suggestions: List[OptimizationSuggestion]
    system_insights: List[SystemInsight]
    created_at: datetime


class AllocationHistoryItem(BaseModel):
    id: UUID
    task_count: int
    assigned_count: int
    avg_score: float
    top_risk: Optional[str]
    created_at: datetime

    model_config = {"from_attributes": True}


# ────────────── NOTIFICATIONS ──────────────
class NotificationOut(BaseModel):
    id: UUID
    type: NotificationType
    title: str
    body: str
    action_url: Optional[str]
    is_read: bool
    created_at: datetime

    model_config = {"from_attributes": True}


# ────────────── CHAT ──────────────
class ChatMessageCreate(BaseModel):
    project_id: UUID
    content: str
    parent_id: Optional[UUID] = None


class ReactionAdd(BaseModel):
    emoji: str


class ChatMessageOut(BaseModel):
    id: UUID
    project_id: UUID
    user_id: UUID
    user_name: str
    user_avatar: Optional[str]
    content: str
    reactions: List[Dict]
    is_pinned: bool
    parent_id: Optional[UUID]
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# ────────────── BILLING ──────────────
class CreateOrder(BaseModel):
    plan: PlanTier
    period: str = "monthly"  # monthly | annual

    @field_validator("plan")
    @classmethod
    def not_free(cls, v: PlanTier) -> PlanTier:
        if v == PlanTier.FREE:
            raise ValueError("Cannot purchase FREE plan")
        return v


class VerifyPayment(BaseModel):
    razorpay_payment_id: str
    razorpay_order_id: str
    razorpay_signature: str
    plan: PlanTier


class CouponApply(BaseModel):
    code: str
    plan: PlanTier


class BillingEventOut(BaseModel):
    id: UUID
    amount: float
    currency: str
    status: str
    plan: PlanTier
    razorpay_payment_id: Optional[str]
    created_at: datetime

    model_config = {"from_attributes": True}


# ────────────── TEAM LOAD ──────────────
class TeamLoadOut(BaseModel):
    members: List[ProjectMemberOut]


# ────────────── ANALYTICS ──────────────
class AnalyticsOut(BaseModel):
    avg_load_trend: List[Dict]
    skill_coverage: List[Dict]
    task_completion_rate: float
    risk_score_trend: List[Dict]
    most_overloaded: Optional[str]
    allocation_efficiency: float


# ────────────── SETTINGS ──────────────
class NotificationPreferencesUpdate(BaseModel):
    email_notifications: Optional[bool] = None
    in_app_notifications: Optional[bool] = None


class ProfileUpdate(BaseModel):
    name: Optional[str] = None
    avatar_url: Optional[str] = None
