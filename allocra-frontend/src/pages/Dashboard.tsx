import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useWorkspaces, useCreateWorkspace, useJoinWorkspace } from "@/hooks/useWorkspaces";
import { useWorkspaceStore } from "@/stores/workspace";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { CardSkeleton } from "@/components/states/PageSkeleton";
import { EmptyState, ErrorState } from "@/components/states/StateViews";
import { IncompleteProfileBanner } from "@/components/projects/IncompleteProfileBanner";
import { Building2, Plus, Users, ArrowRight } from "lucide-react";
import toast from "react-hot-toast";

export default function Dashboard() {
  const navigate = useNavigate();
  const { data, isLoading, isError, refetch } = useWorkspaces();
  const setCurrent = useWorkspaceStore((s) => s.setCurrent);
  const workspaces = data ?? [];

  return (
    <div className="mx-auto max-w-6xl space-y-8 p-6 md:p-10">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Workspaces</h1>
          <p className="mt-1 text-muted-foreground">
            Pick a workspace to jump back into your team's flow.
          </p>
        </div>
        <div className="flex gap-2">
          <JoinDialog />
          <CreateDialog />
        </div>
      </header>

      <IncompleteProfileBanner />

      {isLoading && <CardSkeleton count={6} />}
      {isError && <ErrorState onRetry={() => refetch()} />}
      {!isLoading && !isError && workspaces.length === 0 && (
        <EmptyState
          icon={<Building2 className="h-6 w-6" />}
          title="No workspaces yet"
          message="Create your first workspace or join one with a code."
          action={
            <div className="flex gap-2">
              <JoinDialog />
              <CreateDialog />
            </div>
          }
        />
      )}

      {!isLoading && workspaces.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {workspaces.map((ws) => (
            <Card
              key={ws.id}
              className="group cursor-pointer overflow-hidden border-border/60 p-6 transition-all hover:border-primary/40 hover:shadow-[var(--shadow-md)]"
              onClick={() => {
                setCurrent(ws);
                navigate(`/workspaces/${ws.id}`);
              }}
            >
              <div className="flex items-start justify-between">
                <div
                  className="flex h-11 w-11 items-center justify-center rounded-xl text-primary-foreground"
                  style={{ background: "var(--gradient-primary)" }}
                >
                  <Building2 className="h-5 w-5" />
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1" />
              </div>
              <div className="mt-4">
                <div className="text-lg font-semibold">{ws.name}</div>
                <div className="mt-1 text-sm text-muted-foreground">
                  {ws.member_count ?? 0} members
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function CreateDialog() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const create = useCreateWorkspace();

  const submit = async () => {
    if (!name.trim()) return toast.error("Name required");
    try {
      await create.mutateAsync({ name: name.trim() });
      toast.success("Workspace created");
      setOpen(false);
      setName("");
    } catch {
      toast.error("Could not create");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-1.5 h-4 w-4" /> New workspace
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create workspace</DialogTitle>
        </DialogHeader>
        <Input
          placeholder="Workspace name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
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

function JoinDialog() {
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const join = useJoinWorkspace();

  const submit = async () => {
    if (!code.trim()) return toast.error("Code required");
    try {
      await join.mutateAsync({ join_code: code.trim() });
      toast.success("Joined workspace");
      setOpen(false);
      setCode("");
    } catch {
      toast.error("Invalid code");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Users className="mr-1.5 h-4 w-4" /> Join
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Join workspace</DialogTitle>
        </DialogHeader>
        <Input
          placeholder="Enter join code"
          value={code}
          onChange={(e) => setCode(e.target.value)}
        />
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={join.isPending}>
            {join.isPending ? "Joining..." : "Join"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
