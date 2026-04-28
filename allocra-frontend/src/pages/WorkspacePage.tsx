import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useWorkspaces } from "@/hooks/useWorkspaces";
import { useProjects, useCreateProject } from "@/hooks/useProjects";
import { useWorkspaceStore } from "@/stores/workspace";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { CardSkeleton } from "@/components/states/PageSkeleton";
import { EmptyState, ErrorState } from "@/components/states/StateViews";
import { FolderKanban, Plus, Copy, Users } from "lucide-react";
import toast from "react-hot-toast";

export default function WorkspacePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: workspaces } = useWorkspaces();
  const setCurrent = useWorkspaceStore((s) => s.setCurrent);
  const list = workspaces ?? [];
  const ws = list.find((w) => w.id === id) ?? null;

  const { data: projectsData, isLoading, isError, refetch } = useProjects(id);
  const projects = projectsData ?? [];

  const switchWs = (newId: string) => {
    const next = list.find((w) => w.id === newId);
    if (next) {
      setCurrent(next);
      navigate(`/workspaces/${next.id}`);
    }
  };

  const copyCode = async () => {
    if (!ws?.join_code) return;
    await navigator.clipboard.writeText(ws.join_code);
    toast.success("Join code copied");
  };

  return (
    <div className="mx-auto max-w-6xl space-y-8 p-6 md:p-10">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="text-xs uppercase tracking-widest text-muted-foreground">
            Workspace
          </div>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">
            {ws?.name ?? "Workspace"}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <Users className="h-4 w-4" /> {ws?.member_count ?? 0} members
            </span>
            {ws?.join_code && (
              <button
                onClick={copyCode}
                className="inline-flex items-center gap-1.5 rounded-full bg-accent px-3 py-1 text-xs text-accent-foreground transition-colors hover:opacity-80"
              >
                <Copy className="h-3 w-3" />
                <span className="font-mono">{ws.join_code}</span>
              </button>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          {list.length > 1 && (
            <Select value={id} onValueChange={switchWs}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Switch workspace" />
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
          {id && <CreateProjectDialog workspaceId={id} />}
        </div>
      </header>

      <section>
        <h2 className="mb-4 text-lg font-semibold">Projects</h2>
        {isLoading && <CardSkeleton count={6} />}
        {isError && <ErrorState onRetry={() => refetch()} />}
        {!isLoading && !isError && projects.length === 0 && (
          <EmptyState
            icon={<FolderKanban className="h-6 w-6" />}
            title="No projects yet"
            message="Create your first project to start allocating work."
            action={id && <CreateProjectDialog workspaceId={id} />}
          />
        )}
        {!isLoading && projects.length > 0 && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {projects.map((p) => (
              <Card
                key={p.id}
                className="group cursor-pointer border-border/60 p-6 transition-all hover:border-primary/40 hover:shadow-[var(--shadow-md)]"
                onClick={() => navigate(`/workspaces/${id}/projects/${p.id}`)}
              >
                <div
                  className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl text-primary-foreground"
                  style={{ background: "var(--gradient-primary)" }}
                >
                  <FolderKanban className="h-5 w-5" />
                </div>
                <div className="text-base font-semibold">{p.name}</div>
                {p.description && (
                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                    {p.description}
                  </p>
                )}
                <div className="mt-4 flex gap-3 text-xs text-muted-foreground">
                  <span>{p.member_count ?? 0} members</span>
                  <span>·</span>
                  <span>{p.task_count ?? 0} tasks</span>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function CreateProjectDialog({ workspaceId }: { workspaceId: string }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const create = useCreateProject();

  const submit = async () => {
    if (!name.trim()) return toast.error("Name required");
    try {
      await create.mutateAsync({
        workspace_id: workspaceId,
        name: name.trim(),
        description: desc.trim() || undefined,
      });
      toast.success("Project created");
      setOpen(false);
      setName("");
      setDesc("");
    } catch {
      toast.error("Could not create project");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-1.5 h-4 w-4" /> New project
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create project</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Input
            placeholder="Project name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <Textarea
            placeholder="Description (optional)"
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            rows={3}
          />
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={create.isPending}>
            {create.isPending ? "Creating..." : "Create"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
