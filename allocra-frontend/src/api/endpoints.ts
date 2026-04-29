import api from "./client";
import type {
  User,
  Workspace,
  WorkspaceMember,
  Project,
  ProjectMember,
  Task,
  AllocationResult,
  AllocationHistoryItem,
  Notification,
  ChatMessage,
  BillingEvent,
  AnalyticsOut,
  TeamLoadOut,
} from "@/types";

// ── AUTH ──────────────────────────────────────────────────────────────
export const authApi = {
  getMe: () => api.get<User>("/auth/me"),
  updateMe: (data: { name?: string; avatar_url?: string; plan_tier?: "FREE" | "PRO" | "TEAM" }) =>
    api.patch<User>("/auth/me", data),
  updateOnboarding: (data: { step: number; complete?: boolean }) =>
    api.patch<User>("/auth/onboarding", data),
  updateNotificationPrefs: (data: {
    email_notifications?: boolean;
    in_app_notifications?: boolean;
  }) => api.patch<User>("/auth/notifications", data),
  deleteAccount: () => api.delete("/auth/me"),
};

// ── WORKSPACES ────────────────────────────────────────────────────────
export const workspaceApi = {
  list: () => api.get<Workspace[]>("/workspaces"),
  create: (data: { name: string }) => api.post<Workspace>("/workspaces", data),
  update: (id: string, data: { name: string }) =>
    api.patch<Workspace>(`/workspaces/${id}`, data),
  join: (join_code: string) =>
    api.post<Workspace>("/workspaces/join", { join_code }),
  regenerateCode: (id: string) =>
    api.post<Workspace>(`/workspaces/${id}/regenerate-code`),
  delete: (id: string) => api.delete(`/workspaces/${id}`),
  listMembers: (id: string) =>
    api.get<WorkspaceMember[]>(`/workspaces/${id}/members`),
  removeMember: (workspaceId: string, memberId: string) =>
    api.delete(`/workspaces/${workspaceId}/members/${memberId}`),
};

// ── PROJECTS ──────────────────────────────────────────────────────────
export const projectApi = {
  list: (workspace_id: string) =>
    api.get<Project[]>("/projects", { params: { workspace_id } }),
  create: (data: {
    workspace_id: string;
    name: string;
    description?: string;
  }) => api.post<Project>("/projects", data),
  update: (id: string, data: { name?: string; description?: string }) =>
    api.patch<Project>(`/projects/${id}`, data),
  archive: (id: string) => api.post<Project>(`/projects/${id}/archive`),
  delete: (id: string) => api.delete(`/projects/${id}`),
  listMembers: (id: string) =>
    api.get<ProjectMember[]>(`/projects/${id}/members`),
  addMember: (id: string, display_id: string) =>
    api.post<ProjectMember>(`/projects/${id}/members`, { display_id }),
  removeMember: (projectId: string, membershipId: string) =>
    api.delete(`/projects/${projectId}/members/${membershipId}`),
  updateMySkills: (
    projectId: string,
    skills: { name: string; level: number }[]
  ) =>
    api.patch<ProjectMember>(`/projects/${projectId}/members/me/skills`, {
      skills,
    }),
  updateMyAvailability: (projectId: string, available_hours: number) =>
    api.patch<ProjectMember>(`/projects/${projectId}/members/me/availability`, {
      available_hours,
    }),
  getTeamLoad: (projectId: string) =>
    api.get<TeamLoadOut>(`/projects/${projectId}/team-load`),
  getActivity: (projectId: string) =>
    api.get<unknown[]>(`/projects/${projectId}/activity`),
};

// ── TASKS ─────────────────────────────────────────────────────────────
export const taskApi = {
  list: (project_id: string, status?: string) =>
    api.get<Task[]>("/tasks", {
      params: { project_id, ...(status ? { status } : {}) },
    }),
  create: (data: {
    project_id: string;
    title: string;
    description?: string;
    required_skill: string;
    required_level: number;
    estimated_hours: number;
    priority?: string;
  }) => api.post<Task>("/tasks", data),
  update: (id: string, data: Partial<Task>) =>
    api.patch<Task>(`/tasks/${id}`, data),
  delete: (id: string) => api.delete(`/tasks/${id}`),
  submit: (
    id: string,
    data: { description: string; links?: string[]; files?: string[] }
  ) => api.post<Task>(`/tasks/${id}/submit`, data),
  review: (
    id: string,
    data: {
      decision: "APPROVED" | "REJECTED";
      feedback?: string;
      rating?: number;
    }
  ) => api.post<Task>(`/tasks/${id}/review`, data),
};

// ── ALLOCATION ────────────────────────────────────────────────────────
export const allocationApi = {
  run: (project_id: string) =>
    api.post<AllocationResult>("/allocate", null, { params: { project_id } }),
  history: (project_id: string) =>
    api.get<AllocationHistoryItem[]>("/allocate/history", {
      params: { project_id },
    }),
};

// ── NOTIFICATIONS ─────────────────────────────────────────────────────
export const notificationApi = {
  list: () => api.get<Notification[]>("/notifications"),
  unreadCount: () => api.get<{ count: number }>("/notifications/unread-count"),
  markAllRead: () => api.patch("/notifications/read"),
};

// ── CHAT ──────────────────────────────────────────────────────────────
export const chatApi = {
  getMessages: (project_id: string, parent_id?: string) =>
    api.get<ChatMessage[]>("/chat/messages", {
      params: { project_id, parent_id },
    }),
  sendMessage: (data: {
    project_id: string;
    content: string;
    parent_id?: string;
  }) => api.post<ChatMessage>("/chat/messages", data),
  addReaction: (messageId: string, emoji: string) =>
    api.post<ChatMessage>(`/chat/messages/${messageId}/reactions`, { emoji }),
  togglePin: (messageId: string) =>
    api.post<ChatMessage>(`/chat/messages/${messageId}/pin`),
};

// ── BILLING ───────────────────────────────────────────────────────────
export const billingApi = {
  applyCoupon: (code: string, plan: string) =>
    api.post<{ success: boolean; plan: string; message: string }>(
      "/billing/apply-coupon",
      { code, plan }
    ),
  createOrder: (plan: string, period: string = "monthly") =>
    api.post<{
      order_id: string;
      amount: number;
      currency: string;
      key_id: string;
    }>("/billing/create-order", { plan, period }),
  verifyPayment: (data: {
    razorpay_payment_id: string;
    razorpay_order_id: string;
    razorpay_signature: string;
    plan: string;
  }) => api.post("/billing/verify", data),
  history: () => api.get<BillingEvent[]>("/billing/history"),
};

// ── ANALYTICS ─────────────────────────────────────────────────────────
export const analyticsApi = {
  getProject: (project_id: string) =>
    api.get<AnalyticsOut>("/analytics/project", { params: { project_id } }),
};
