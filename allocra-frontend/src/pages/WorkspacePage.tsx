// FULL CLEAN VERSION — NO REPLIT DEPENDENCY

import { useState } from "react";
import { useParams, useLocation, Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useFetcher } from "@/api/fetcher";

import { useWorkspaceStore } from "@/stores/workspace";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CopyButton } from "@/components/shared/CopyButton";
import { EmptyState } from "@/components/shared/EmptyState";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { FolderKanban, RefreshCw, PlusCircle, Trash2, Settings, ChevronRight } from "lucide-react";
import { ConfirmModal } from "@/components/shared/ConfirmModal";

export default function WorkspacePage() {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const [, setLocation] = useLocation();

  const fetcher = useFetcher();
  const queryClient = useQueryClient();
  const { setActiveWorkspace } = useWorkspaceStore();

  const [createProjectOpen, setCreateProjectOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [removeMemberId, setRemoveMemberId] = useState<string | null>(null);
  const [projectName, setProjectName] = useState("");
  const [projectDesc, setProjectDesc] = useState("");
  const [wsName, setWsName] = useState("");

  // =========================
  // QUERIES
  // =========================

  const { data: workspace, isLoading } = useQuery({
    queryKey: ["workspace", workspaceId],
    queryFn: () => fetcher(`/workspaces/${workspaceId}`),
    enabled: !!workspaceId,
  });

  const { data: projects } = useQuery({
    queryKey: ["projects", workspaceId],
    queryFn: () => fetcher(`/workspaces/${workspaceId}/projects`),
    enabled: !!workspaceId,
  });

  const { data: members } = useQuery({
    queryKey: ["members", workspaceId],
    queryFn: () => fetcher(`/workspaces/${workspaceId}/members`),
    enabled: !!workspaceId,
  });

  // =========================
  // MUTATIONS
  // =========================

  const createProject = useMutation({
    mutationFn: (data: any) =>
      fetcher(`/projects`, {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects", workspaceId] });
      toast({ title: "Project created!" });
    },
  });

  const updateWorkspace = useMutation({
    mutationFn: (data: any) =>
      fetcher(`/workspaces/${workspaceId}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workspace", workspaceId] });
      toast({ title: "Workspace updated!" });
    },
  });

  const regenerateCode = useMutation({
    mutationFn: () =>
      fetcher(`/workspaces/${workspaceId}/regenerate-code`, {
        method: "POST",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workspace", workspaceId] });
      toast({ title: "Join code regenerated!" });
    },
  });

  const removeMember = useMutation({
    mutationFn: (memberId: string) =>
      fetcher(`/workspaces/${workspaceId}/members/${memberId}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["members", workspaceId] });
      toast({ title: "Member removed." });
    },
  });

  // =========================
  // HANDLERS
  // =========================

  const handleCreateProject = async () => {
    if (!projectName.trim()) return;

    await createProject.mutateAsync({
      workspace_id: workspaceId,
      name: projectName,
      description: projectDesc || undefined,
    });

    setCreateProjectOpen(false);
    setProjectName("");
    setProjectDesc("");
  };

  const handleUpdateWorkspace = async () => {
    if (!wsName.trim()) return;

    await updateWorkspace.mutateAsync({ name: wsName });
    setEditOpen(false);
  };

  const handleRegenerateCode = async () => {
    await regenerateCode.mutateAsync();
  };

  const handleRemoveMember = async () => {
    if (!removeMemberId) return;
    await removeMember.mutateAsync(removeMemberId);
    setRemoveMemberId(null);
  };

  // =========================
  // UI
  // =========================

  if (!workspaceId) return null;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold">{workspace?.name}</h1>
      <p className="text-sm">Projects: {projects?.length ?? 0}</p>
    </div>
  );
}