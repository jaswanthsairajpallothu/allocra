import uuid
from datetime import datetime
from pydantic import BaseModel
from app.core.constants import RiskLevel

class AllocationRequest(BaseModel):
    project_id: uuid.UUID

class ScoreBreakdown(BaseModel):
    skill: float
    workload: float
    availability: float
    priority: float

class RiskDetail(BaseModel):
    risk_score: float
    risk_level: RiskLevel
    reasons: list[str]

class TaskAllocationResult(BaseModel):
    task_id: uuid.UUID
    task_title: str
    assigned_to_user_id: uuid.UUID
    assigned_to_name: str
    score: float
    score_breakdown: ScoreBreakdown
    risk: RiskDetail
    workload_after: float

class WorkloadOptimizationSuggestion(BaseModel):
    suggestion: str
    reason: str
    from_user: str
    to_user: str
    task_title: str

class SystemInsight(BaseModel):
    type: str
    message: str

class AllocationRunOut(BaseModel):
    run_id: uuid.UUID
    project_id: uuid.UUID
    assignments: list[TaskAllocationResult]
    unassigned_tasks: list[dict]
    optimization_suggestions: list[WorkloadOptimizationSuggestion]
    system_insights: list[SystemInsight]
    created_at: datetime
