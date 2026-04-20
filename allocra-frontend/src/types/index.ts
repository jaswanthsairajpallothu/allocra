export interface User {
  id: string
  email: string
  name: string
  created_at: string
}

export interface Workspace {
  id: string
  name: string
  join_code: string
  created_by: string | null
  created_at: string
}

export interface Project {
  id: string
  name: string
  description: string | null
  workspace_id: string
  created_by: string | null
  created_at: string
}

export interface SkillEntry {
  skill: string
  level: number
}

export interface Membership {
  id: string
  user_id: string
  project_id: string
  skills: SkillEntry[]
  available_hours: number
  created_at: string
}

export interface MemberLoad {
  membership_id: string
  user_id: string
  user_name: string
  load_pct: number
  assigned_hours: number
  available_hours: number
  status: 'SAFE' | 'WARNING' | 'OVERLOAD'
  skills: SkillEntry[]
}

export interface Task {
  id: string
  title: string
  description: string | null
  project_id: string
  required_skill: string
  required_level: number
  estimated_hours: number
  priority: 'LOW' | 'MEDIUM' | 'HIGH'
  status: 'PENDING' | 'ASSIGNED' | 'COMPLETED'
  created_at: string
}

export interface ScoreBreakdown {
  skill: number
  workload: number
  availability: number
  priority: number
}

export interface RiskDetail {
  risk_score: number
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH'
  reasons: string[]
}

export interface TaskAllocationResult {
  task_id: string
  task_title: string
  assigned_to_user_id: string
  assigned_to_name: string
  score: number
  score_breakdown: ScoreBreakdown
  risk: RiskDetail
  workload_after: number
}

export interface OptimizationSuggestion {
  suggestion: string
  reason: string
  from_user: string
  to_user: string
  task_title: string
}

export interface SystemInsight {
  type: 'UNASSIGNED' | 'SKILL_GAP' | 'DEPENDENCY_RISK'
  message: string
}

export interface AllocationRun {
  run_id: string
  project_id: string
  assignments: TaskAllocationResult[]
  unassigned_tasks: { task_id: string; title: string; reason: string }[]
  optimization_suggestions: OptimizationSuggestion[]
  system_insights: SystemInsight[]
  created_at: string
}

export interface TokenResponse {
  access_token: string
  token_type: string
  user: User
}
