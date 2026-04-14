const BASE_URL = "https://allocra.onrender.com/api/v1";

export interface Skill {
  skill_name: string;
  level: number;
}
export interface User {
  id: number;
  name: string;
  available_hours: number;
  skills: Skill[];
}
export interface Task {
  id: number;
  title: string;
  required_skill: string;
  difficulty: number;
  priority: number;
}
export interface AllocationReasoning {
  assigned_to: string;
  score: number;
  skill_level: number;
  load_after_assignment: number;
}
export interface AllocationResult {
  assigned: Record<string, number>;
  unassigned: number[];
  reasoning: Record<string, AllocationReasoning>;
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "Unknown error");
    throw new Error(`API error ${res.status}: ${text}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  getUsers: () => request<User[]>("/users/"),
  getTasks: () => request<Task[]>("/tasks/"),
  createUser: (data: { name: string; available_hours: number; skills: Skill[] }) =>
    request<User>("/users/", { method: "POST", body: JSON.stringify(data) }),
  createTask: (data: { title: string; required_skill: string; difficulty: number; priority: number }) =>
    request<Task>("/tasks/", { method: "POST", body: JSON.stringify(data) }),
  runAllocation: () =>
    request<AllocationResult>("/allocate/", { method: "POST" }),
};
