import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getWorkspace, getWorkspaces, joinWorkspace } from "@/api/services/workspace.service";

export const useWorkspaces = () =>
  useQuery({
    queryKey: ["workspaces"],
    queryFn: getWorkspaces,
  });

export const useWorkspace = (id: string) =>
  useQuery({
    queryKey: ["workspace", id],
    queryFn: () => getWorkspace(id),
    enabled: !!id,
  });

export const useJoinWorkspace = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: joinWorkspace,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["workspaces"] });
    },
  });
};