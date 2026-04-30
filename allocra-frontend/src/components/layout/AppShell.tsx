import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  FolderKanban,
  Bell,
  Settings,
  CreditCard,
  Sparkles,
  Building2,
} from "lucide-react";
import { UserButton } from "@clerk/clerk-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useUnreadCount } from "@/hooks/useNotifications";
import { useWorkspaceStore } from "@/stores/workspace";
import { ReactNode, useState } from "react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu } from "lucide-react";

const nav = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/projects", label: "Projects", icon: FolderKanban },
  { to: "/notifications", label: "Notifications", icon: Bell },
  { to: "/settings", label: "Settings", icon: Settings },
  { to: "/billing", label: "Billing", icon: CreditCard },
];

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { data: unread } = useUnreadCount();
  const current = useWorkspaceStore((s) => s.current);
  return (
    <div className="flex h-full flex-col gap-2 p-4">
      <div className="mb-4 flex items-center gap-2 px-2">
        <img
          src="/assets/allocra_web_logo.jpeg"
          alt="Allocra"
          className="h-9 w-9 rounded-xl object-contain"
        />
        <div>
          <div className="text-base font-bold tracking-tight">Allocra</div>
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
            AI workload
          </div>
        </div>
      </div>

      {current && (
        <div className="mb-2 rounded-xl border border-border bg-card px-3 py-2">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Building2 className="h-3.5 w-3.5" /> Workspace
          </div>
          <div className="truncate text-sm font-semibold">{current.name}</div>
        </div>
      )}

      <nav className="flex flex-col gap-1">
        {nav.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            onClick={onNavigate}
            className={({ isActive }) =>
              `flex items-center justify-between rounded-xl px-3 py-2.5 text-sm transition-colors ${
                isActive
                  ? "bg-accent text-accent-foreground font-medium"
                  : "text-foreground/70 hover:bg-muted"
              }`
            }
          >
            <span className="flex items-center gap-3">
              <Icon className="h-4 w-4" />
              {label}
            </span>
            {to === "/notifications" && (unread ?? 0) > 0 ? (
              <Badge className="h-5 min-w-5 rounded-full px-1.5 text-[10px]">
                {(unread ?? 0) > 99 ? "99+" : unread}
              </Badge>
            ) : null}
          </NavLink>
        ))}
      </nav>

      <div className="mt-auto flex items-center justify-between rounded-xl border border-border bg-card p-3">
        <UserButton afterSignOutUrl="/sign-in" />
        <Button size="sm" variant="ghost" asChild>
          <NavLink to="/billing">Upgrade</NavLink>
        </Button>
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen w-full bg-background surface-mesh">
      {/* desktop sidebar */}
      <aside className="hidden w-64 shrink-0 border-r border-border bg-sidebar md:block">
        <SidebarContent />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-border bg-background/80 px-4 backdrop-blur">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0">
              <SidebarContent onNavigate={() => setMobileOpen(false)} />
            </SheetContent>
          </Sheet>
          <div className="text-sm text-muted-foreground">
            {location.pathname}
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/notifications")}
            >
              <Bell className="h-4 w-4" />
            </Button>
          </div>
        </header>

        <main key={location.pathname} className="flex-1 animate-fade-in">
          {children}
        </main>
      </div>
    </div>
  );
}
