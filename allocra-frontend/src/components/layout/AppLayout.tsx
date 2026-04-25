import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import api from "@/api/client";

import { useWorkspaceStore } from "@/stores/workspace";
import { PlanBadge } from "@/components/shared/PlanBadge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

import {
  LayoutDashboard, Bell, Settings, CreditCard,
  Zap, Menu, X
} from "lucide-react";

interface AppLayoutProps {
  children: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { activeWorkspaceId, setActiveWorkspace } = useWorkspaceStore();

  // ✅ API CALLS
  const { data: me } = useQuery({
    queryKey: ["me"],
    queryFn: async () => (await api.get("/auth/me")).data,
  });

  const { data: workspaces } = useQuery({
    queryKey: ["workspaces"],
    queryFn: async () => (await api.get("/workspaces")).data,
  });

  const { data: projects } = useQuery({
    queryKey: ["projects", activeWorkspaceId],
    enabled: !!activeWorkspaceId,
    queryFn: async () =>
      (await api.get("/projects", { params: { workspace_id: activeWorkspaceId } })).data,
  });

  const { data: unread } = useQuery({
    queryKey: ["notifications-unread"],
    queryFn: async () => (await api.get("/notifications/unread-count")).data,
  });

  // ✅ NORMALIZED DATA (CRITICAL FIX)
  const workspaceList = Array.isArray(workspaces)
    ? workspaces
    : workspaces?.data || workspaces?.workspaces || [];

  const projectList = Array.isArray(projects)
    ? projects
    : projects?.data || projects?.projects || [];

  const unreadCount = unread?.count ?? 0;

  const navItems = [
    { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
    { href: "/notifications", icon: Bell, label: "Notifications", badge: unreadCount || undefined },
    { href: "/billing", icon: CreditCard, label: "Billing" },
    { href: "/settings", icon: Settings, label: "Settings" },
  ];

  const Sidebar = () => (
    <aside className="w-60 min-h-screen bg-sidebar border-r flex flex-col">
      <div className="p-4 border-b">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-primary rounded-lg flex items-center justify-center">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold">Allocra</span>
        </div>
      </div>

      <div className="p-3 border-b">
        <Select value={activeWorkspaceId ?? ""} onValueChange={setActiveWorkspace}>
          <SelectTrigger>
            <SelectValue placeholder="Select workspace" />
          </SelectTrigger>
          <SelectContent>
            {workspaceList.map((ws: any) => (
              <SelectItem key={ws.id} value={ws.id}>
                {ws.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <nav className="flex-1 p-3 overflow-y-auto">
        {projectList.map((project: any) => (
          <Link key={project.id} href={`/workspaces/${activeWorkspaceId}/projects/${project.id}`}>
            <div
              className={cn(
                "px-2 py-1.5 rounded-lg text-sm cursor-pointer",
                location.includes(project.id)
                  ? "bg-accent"
                  : "text-muted-foreground"
              )}
            >
              {project.name}
            </div>
          </Link>
        ))}
      </nav>

      <div className="p-3 border-t">
        {navItems.map((item) => (
          <Link key={item.href} href={item.href}>
            <div className="flex items-center gap-2 px-2 py-1.5 text-sm cursor-pointer">
              <item.icon className="w-4 h-4" />
              <span>{item.label}</span>
              {item.badge && (
                <span className="ml-auto text-xs bg-primary text-white px-1.5 rounded">
                  {item.badge}
                </span>
              )}
            </div>
          </Link>
        ))}

        <div className="flex items-center gap-2 mt-3">
          <Avatar>
            <AvatarImage src={me?.avatar_url} />
            <AvatarFallback>{me?.name?.[0]}</AvatarFallback>
          </Avatar>
          <div>
            <p className="text-sm">{me?.name}</p>
            <PlanBadge plan={me?.plan_tier ?? "FREE"} />
          </div>
        </div>
      </div>
    </aside>
  );

  return (
    <div className="flex min-h-screen">
      <div className="hidden md:flex">
        <Sidebar />
      </div>

      <div className="flex-1 flex flex-col">
        <div className="md:hidden p-3 border-b flex items-center gap-2">
          <Button onClick={() => setMobileOpen(!mobileOpen)}>
            {mobileOpen ? <X /> : <Menu />}
          </Button>
        </div>

        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}