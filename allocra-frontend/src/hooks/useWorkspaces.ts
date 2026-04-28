import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { workspaceApi } from "@/api/endpoints";
import { safeArray, extractError } from "@/api/helpers";
import type { Workspace, WorkspaceMember } from "@/types";
import toast from "react-hot-toast";

export function useWorkspaces() {
  return useQuery({
    queryKey: ["workspaces"],
    queryFn: async (): Promise<Workspace[]> => {
      const res = await workspaceApi.list();
      return safeArray<Workspace>(res.data);
    },
  });
}

export function useWorkspaceMembers(workspaceId: string | undefined) {
  return useQuery({
    queryKey: ["workspace-members", workspaceId],
    enabled: !!workspaceId,
    queryFn: async (): Promise<WorkspaceMember[]> => {
      const res = await workspaceApi.listMembers(workspaceId!);
      return safeArray<WorkspaceMember>(res.data);
    },
  });
}

export function useCreateWorkspace() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { name: string }) => {
      const res = await workspaceApi.create(input);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["workspaces"] });
    },
    onError: (e) => toast.error(extractError(e)),
  });
}

export function useJoinWorkspace() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { join_code: string }) => {
      const res = await workspaceApi.join(input.join_code);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["workspaces"] });
    },
    onError: (e) => toast.error(extractError(e)),
  });
}

export function useRegenerateCode() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await workspaceApi.regenerateCode(id);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["workspaces"] });
      toast.success("Join code regenerated");
    },
    onError: (e) => toast.error(extractError(e)),
  });
}
