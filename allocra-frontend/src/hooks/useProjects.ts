import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { projectApi } from "@/api/endpoints";
import { safeArray, extractError } from "@/api/helpers";
import type { Project, ProjectMember } from "@/types";
import { useMe } from "@/hooks/useAuth";
import toast from "react-hot-toast";

/**
 * A membership is "incomplete" if the user has no skills set OR no availability set.
 * This is the gate for allocation/assignment per PRD.
 */
export function isMembershipIncomplete(m: ProjectMember | null | undefined): boolean {
  if (!m) return false;
  const skills = safeArray<{ name: string; level: number }>(m.skills);
  return skills.length === 0 || !m.available_hours || m.available_hours <= 0;
}

/**
 * Return the current user's ProjectMember row for a given project, if any.
 */
export function useMyProjectMembership(projectId: string | undefined) {
  const meQ = useMe();
  const membersQ = useProjectMembers(projectId);
  const me = meQ.data;
  const members = safeArray<ProjectMember>(membersQ.data);
  const mine = useMemo(() => {
    if (!me) return null;
    return (
      members.find(
        (m) =>
          m.display_id === me.display_id ||
          (me.id && m.user_id === me.id)
      ) ?? null
    );
  }, [members, me]);
  return {
    membership: mine,
    isLoading: meQ.isLoading || membersQ.isLoading,
    isError: meQ.isError || membersQ.isError,
    refetch: () => membersQ.refetch(),
  };
}

export function useProjects(workspaceId: string | undefined) {
  return useQuery({
    queryKey: ["projects", workspaceId],
    enabled: !!workspaceId,
    queryFn: async (): Promise<Project[]> => {
      const res = await projectApi.list(workspaceId!);
      return safeArray<Project>(res.data);
    },
  });
}

export function useProjectMembers(projectId: string | undefined) {
  return useQuery({
    queryKey: ["project-members", projectId],
    enabled: !!projectId,
    refetchInterval: 30_000,
    queryFn: async (): Promise<ProjectMember[]> => {
      const res = await projectApi.listMembers(projectId!);
      return safeArray<ProjectMember>(res.data);
    },
  });
}

export function useTeamLoad(projectId: string | undefined) {
  return useQuery({
    queryKey: ["team-load", projectId],
    enabled: !!projectId,
    refetchInterval: 30_000,
    queryFn: async (): Promise<{ members: ProjectMember[] }> => {
      const res = await projectApi.getTeamLoad(projectId!);
      const members = safeArray<ProjectMember>(
        (res.data as { members?: unknown })?.members ?? res.data
      );
      return { members };
    },
  });
}

export function useCreateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      workspace_id: string;
      name: string;
      description?: string;
    }) => {
      const res = await projectApi.create(input);
      return res.data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["projects", data.workspace_id] });
    },
    onError: (e) => toast.error(extractError(e)),
  });
}

export function useAddProjectMember(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (display_id: string) => {
      const res = await projectApi.addMember(projectId, display_id);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["project-members", projectId] });
      toast.success("Member added");
    },
    onError: (e) => toast.error(extractError(e)),
  });
}

export function useRemoveProjectMember(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (membershipId: string) => {
      await projectApi.removeMember(projectId, membershipId);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["project-members", projectId] });
      qc.invalidateQueries({ queryKey: ["team-load", projectId] });
      toast.success("Member removed");
    },
    onError: (e) => toast.error(extractError(e)),
  });
}

export function useUpdateMySkills(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (skills: { name: string; level: number }[]) => {
      const res = await projectApi.updateMySkills(projectId, skills);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["project-members", projectId] });
      qc.invalidateQueries({ queryKey: ["team-load", projectId] });
      toast.success("Skills updated");
    },
    onError: (e) => toast.error(extractError(e)),
  });
}

export function useUpdateMyAvailability(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (hours: number) => {
      const res = await projectApi.updateMyAvailability(projectId, hours);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["team-load", projectId] });
      toast.success("Availability updated");
    },
    onError: (e) => toast.error(extractError(e)),
  });
}
