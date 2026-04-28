// API contract types — backend responses are NOT wrapped.

export type Plan = "FREE" | "PRO" | "TEAM" | "ENTERPRISE";

export interface User {
  id: string;
  display_id?: string;
  email: string;
  name?: string;
  avatar_url?: string;
  onboarding_complete: boolean;
  plan?: Plan;
  notification_preferences?: {
    email?: boolean;
    in_app?: boolean;
    digest?: boolean;
  };
}

export interface Workspace {
  id: string;
  name: string;
  join_code?: string;
  member_count?: number;
  created_at?: string;
  owner_id?: string;
  plan?: Plan;
}

export interface Project {
  id: string;
  workspace_id: string;
  name: string;
  description?: string;
  status?: "active" | "paused" | "archived";
  member_count?: number;
  task_count?: number;
  created_at?: string;
}

export interface Notification {
  id: string;
  title: string;
  body?: string;
  read: boolean;
  type?: string;
  created_at: string;
  link?: string;
}

export interface PlanRequiredError {
  error: "plan_required";
  message: string;
  current: Plan;
  required?: Plan;
}
export * from "./index";
