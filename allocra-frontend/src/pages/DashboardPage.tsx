import { Link } from "wouter";
import api from "@/api/client";
import { useQuery } from "@tanstack/react-query";
import { useWorkspaceStore } from "@/stores/workspace";
import { StatCard } from "@/components/shared/StatCard";
import { PlanBadge } from "@/components/shared/PlanBadge";
import { EmptyState } from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  FolderKanban, Bell, Zap, ChevronRight
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function DashboardPage() {
  const { activeWorkspaceId, setActiveWorkspace } = useWorkspaceStore();

  const { data: me, isLoading: meLoading } = useQuery({
    queryKey: ["me"],
    queryFn: async () => (await api.get("/auth/me")).data,
  });

  const { data: workspacesRaw } = useQuery({
    queryKey: ["workspaces"],
    queryFn: async () => (await api.get("/workspaces")).data,
  });

  const workspaces = Array.isArray(workspacesRaw)
    ? workspacesRaw
    : workspacesRaw?.data || [];

  const targetWorkspaceId = activeWorkspaceId ?? workspaces?.[0]?.id ?? "";

  const { data: projectsRaw } = useQuery({
    queryKey: ["projects", targetWorkspaceId],
    enabled: !!targetWorkspaceId,
    queryFn: async () =>
      (await api.get("/projects", {
        params: { workspace_id: targetWorkspaceId },
      })).data,
  });

  const projects = Array.isArray(projectsRaw)
    ? projectsRaw
    : projectsRaw?.data || [];

  const { data: notificationsRaw } = useQuery({
    queryKey: ["notifications"],
    queryFn: async () => (await api.get("/notifications")).data,
  });

  const notifications = Array.isArray(notificationsRaw)
    ? notificationsRaw
    : notificationsRaw?.data || [];

  if (meLoading) {
    return (
      <div className="flex items-center justify-center h-full min-h-96">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const unread = notifications.filter((n: any) => !n.is_read).length;

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Welcome back{me?.name ? `, ${me.name.split(" ")[0]}` : ""}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Here's what's happening with your teams.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <PlanBadge plan={me?.plan_tier ?? "FREE"} />
          <Link href="/notifications">
            <Button variant="outline" size="sm" className="relative border-border">
              <Bell className="w-4 h-4" />
              {unread > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-primary text-white text-xs rounded-full flex items-center justify-center">
                  {unread}
                </span>
              )}
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Workspaces" value={workspaces.length} />
        <StatCard label="Active Projects" value={projects.length} />
        <StatCard
          label="Notifications"
          value={unread}
          trend={unread > 0 ? "unread" : "all caught up"}
        />
        <StatCard label="Plan" value={me?.plan_tier ?? "FREE"} />
      </div>

      {workspaces.length > 0 ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="bg-card border border-border rounded-xl p-5">
            <h2 className="font-semibold text-foreground mb-4">Workspaces</h2>

            <div className="space-y-3">
              {workspaces.map((ws: any) => (
                <Link key={ws.id} href={`/workspaces/${ws.id}`}>
                  <div
                    className="flex items-center gap-3 p-3 rounded-lg bg-accent hover:bg-accent/70 cursor-pointer transition-colors"
                    onClick={() => setActiveWorkspace(ws.id)}
                  >
                    <div className="w-9 h-9 rounded-lg bg-primary/20 flex items-center justify-center">
                      <span className="text-primary font-bold text-sm">
                        {ws.name[0]}
                      </span>
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-sm">{ws.name}</p>
                      <p className="text-xs text-muted-foreground">
                        Code: <span className="font-mono">{ws.join_code}</span>
                      </p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                </Link>
              ))}
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-5">
            <h2 className="font-semibold text-foreground mb-4">
              Recent Projects
            </h2>

            {projects.length > 0 ? (
              <div className="space-y-3">
                {projects.slice(0, 5).map((project: any) => (
                  <Link
                    key={project.id}
                    href={`/workspaces/${targetWorkspaceId}/projects/${project.id}`}
                  >
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-accent hover:bg-accent/70 cursor-pointer">
                      <FolderKanban className="w-5 h-5 text-primary" />
                      <div className="flex-1">
                        <p className="text-sm font-medium truncate">
                          {project.name}
                        </p>
                      </div>
                      <Badge variant="outline">
                        {project.is_archived ? "archived" : "active"}
                      </Badge>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={FolderKanban}
                title="No projects yet"
                description="Create your first project."
              />
            )}
          </div>
        </div>
      ) : (
        <EmptyState
          icon={Zap}
          title="Get started"
          description="Create or join a workspace."
          actionLabel="Go to onboarding"
          onAction={() => (window.location.href = "/onboarding")}
        />
      )}
    </div>
  );
}