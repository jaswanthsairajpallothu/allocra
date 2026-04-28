import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { taskApi } from "@/api/endpoints";
import { safeArray, extractError } from "@/api/helpers";
import type { Task } from "@/types";
import toast from "react-hot-toast";

export function useTasks(projectId: string | undefined, status?: string) {
  return useQuery({
    queryKey: ["tasks", projectId, status],
    enabled: !!projectId,
    queryFn: async (): Promise<Task[]> => {
      const res = await taskApi.list(projectId!, status);
      return safeArray<Task>(res.data);
    },
  });
}

export function useCreateTask(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      project_id: string;
      title: string;
      description?: string;
      required_skill: string;
      required_level: number;
      estimated_hours: number;
      priority?: string;
    }) => {
      const res = await taskApi.create(input);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks", projectId] });
      toast.success("Task created");
    },
    onError: (e) => toast.error(extractError(e)),
  });
}

export function useUpdateTask(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Task> }) => {
      const res = await taskApi.update(id, data);
      return res.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks", projectId] }),
    onError: (e) => toast.error(extractError(e)),
  });
}

export function useDeleteTask(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await taskApi.delete(id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks", projectId] });
      toast.success("Task deleted");
    },
    onError: (e) => toast.error(extractError(e)),
  });
}

export function useSubmitTask(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: { description: string; links?: string[]; files?: string[] };
    }) => {
      const res = await taskApi.submit(id, data);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks", projectId] });
      toast.success("Work submitted for review");
    },
    onError: (e) => toast.error(extractError(e)),
  });
}

export function useReviewTask(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: {
        decision: "APPROVED" | "REJECTED";
        feedback?: string;
        rating?: number;
      };
    }) => {
      const res = await taskApi.review(id, data);
      return res.data;
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["tasks", projectId] });
      toast.success(
        vars.data.decision === "APPROVED"
          ? "Submission approved"
          : "Submission rejected"
      );
    },
    onError: (e) => toast.error(extractError(e)),
  });
}
