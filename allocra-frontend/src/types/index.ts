// Backend contract — responses are NOT wrapped.

export type PlanTier = "FREE" | "PRO" | "TEAM";
export type TaskPriority = "LOW" | "MEDIUM" | "HIGH";
export type TaskStatus =
  | "PENDING"
  | "ASSIGNED"
  | "IN_PROGRESS"
  | "SUBMITTED"
  | "COMPLETED"
  | "REJECTED";
export type ReviewDecision = "APPROVED" | "REJECTED";

export interface TaskSubmission {
  description: string;
  links?: string[];
  files?: string[];
  submitted_at?: string;
  submitted_by?: string;
  submitted_by_name?: string | null;
}

export interface TaskReview {
  decision: ReviewDecision;
  feedback?: string;
  rating?: number;
  reviewed_at?: string;
  reviewed_by?: string;
  reviewed_by_name?: string | null;
}
export type RiskLevel = "LOW" | "MEDIUM" | "HIGH";
export type LoadStatus = "SAFE" | "WARNING" | "OVERLOAD";
export type NotificationType =
  | "TASK_ASSIGNED"
  | "ALLOCATION_COMPLETE"
  | "MEMBER_JOINED"
  | "RISK_ALERT"
  | "PLAN_UPGRADED";

export interface User {
  id: string;
  email: string;
  name: string;
  display_id: string;
  avatar_url: string | null;
  plan_tier: PlanTier;
  onboarding_step: number;
  onboarding_complete: boolean;
  email_notifications?: boolean;
  in_app_notifications?: boolean;
  created_at: string;
}

export interface Workspace {
  id: string;
  name: string;
  join_code: string;
  creator_id: string | null;
  member_count: number;
  project_count: number;
  created_at: string;
}

export interface WorkspaceMember {
  id: string;
  user_id: string;
  name: string;
  email: string;
  display_id: string;
  avatar_url: string | null;
  is_admin: boolean;
  joined_at: string;
  last_active_at: string | null;
}

export interface Project {
  id: string;
  workspace_id: string;
  name: string;
  description: string | null;
  is_archived: boolean;
  member_count: number;
  task_count: number;
  created_at: string;
}

export interface Skill {
  name: string;
  level: number;
}

export interface ProjectMember {
  id: string;
  user_id: string;
  name: string;
  email: string;
  display_id: string;
  avatar_url: string | null;
  skills: Skill[];
  available_hours: number;
  assigned_hours: number;
  load_percent: number;
  load_status: LoadStatus;
  joined_at: string;
}

export interface TeamLoadOut {
  members: ProjectMember[];
}

export interface Task {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  required_skill: string;
  required_level: number;
  estimated_hours: number;
  priority: TaskPriority;
  status: TaskStatus;
  assigned_to: string | null;
  assignee_name: string | null;
  created_at: string;
  updated_at: string;
  submission?: TaskSubmission | null;
  review?: TaskReview | null;
}

export interface ScoreBreakdown {
  skill: number;
  workload: number;
  availability: number;
  priority_bonus: number;
}

export interface AssignmentResult {
  task_id: string;
  task_title: string;
  assigned_to_user_id: string | null;
  assigned_to_name: string | null;
  score: number;
  breakdown: ScoreBreakdown;
  risk_score: number;
  risk_level: RiskLevel;
  risk_reasons: string[];
  load_after: number;
}

export interface OptimizationSuggestion {
  task_id: string;
  task_title: string;
  from_user: string;
  to_user: string;
  reason: string;
}

export interface SystemInsight {
  type: string;
  message: string;
  severity: "red" | "amber";
}

export interface AllocationResult {
  run_id: string;
  project_id: string;
  assigned: number;
  unassigned: number;
  total_tasks: number;
  avg_score: number;
  assignments: AssignmentResult[];
  unassigned_tasks: { task_id: string; task_title: string; reason: string }[];
  optimization_suggestions: OptimizationSuggestion[];
  system_insights: SystemInsight[];
  created_at: string;
}

export interface AllocationHistoryItem {
  id: string;
  task_count: number;
  assigned_count: number;
  avg_score: number;
  top_risk: string | null;
  created_at: string;
}

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  action_url: string | null;
  is_read: boolean;
  created_at: string;
}

export interface ChatMessage {
  id: string;
  project_id: string;
  user_id: string;
  user_name: string;
  user_avatar: string | null;
  content: string;
  reactions: { emoji: string; user_ids: string[] }[];
  is_pinned: boolean;
  parent_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface BillingEvent {
  id: string;
  amount: number;
  currency: string;
  status: string;
  plan: PlanTier;
  razorpay_payment_id: string | null;
  created_at: string;
}

export interface AnalyticsOut {
  avg_load_trend: {
    run: number;
    avg_score: number;
    assigned: number;
    total: number;
    date: string;
  }[];
  skill_coverage: { skill: string; member_count: number; avg_level: number }[];
  task_completion_rate: number;
  risk_score_trend: { run: number; risk: string; date: string }[];
  most_overloaded: string | null;
  allocation_efficiency: number;
}

export interface PlanRequiredError {
  error: "plan_required";
  message: string;
  current: PlanTier;
  required?: PlanTier;
}
