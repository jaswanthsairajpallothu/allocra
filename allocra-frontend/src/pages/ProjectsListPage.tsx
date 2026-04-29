import { useNavigate } from "react-router-dom";
import { useWorkspaces } from "@/hooks/useWorkspaces";
import { useProjects } from "@/hooks/useProjects";
import { useWorkspaceStore } from "@/stores/workspace";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CardSkeleton } from "@/components/states/PageSkeleton";
import { EmptyState } from "@/components/states/StateViews";
import { FolderKanban } from "lucide-react";
import { useEffect } from "react";

export default function ProjectsListPage() {
  const navigate = useNavigate();
  const { data: workspaces } = useWorkspaces();
  const list = workspaces ?? [];
  const current = useWorkspaceStore((s) => s.current);
  const setCurrent = useWorkspaceStore((s) => s.setCurrent);

  useEffect(() => {
    if (!current && list[0]) setCurrent(list[0]);
  }, [list, current, setCurrent]);

  const { data, isLoading } = useProjects(current?.id);
  const projects = data ?? [];

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6 md:p-10">
      <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">All projects</h1>
          <p className="mt-1 text-muted-foreground">
            Browse projects across your workspace.
          </p>
        </div>
        {list.length > 0 && (
          <Select
            value={current?.id}
            onValueChange={(v) => {
              const next = list.find((w) => w.id === v);
              if (next) setCurrent(next);
            }}
          >
            <SelectTrigger className="w-56">
              <SelectValue placeholder="Select workspace" />
            </SelectTrigger>
            <SelectContent>
              {list.map((w) => (
                <SelectItem key={w.id} value={w.id}>
                  {w.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </header>

      {isLoading && <CardSkeleton count={6} />}
      {!isLoading && projects.length === 0 && (
        <EmptyState
          icon={<FolderKanban className="h-6 w-6" />}
          title="No projects"
          message="Create a project from your workspace page."
        />
      )}
      {!isLoading && projects.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => (
            <Card
              key={p.id}
              className="cursor-pointer p-6 transition-all hover:border-primary/40 hover:shadow-[var(--shadow-md)]"
              onClick={() =>
                navigate(`/workspaces/${current?.id}/projects/${p.id}`)
              }
            >
              <div className="text-base font-semibold">{p.name}</div>
              {p.description && (
                <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                  {p.description}
                </p>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
