import { useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/states/StateViews";
import { useWorkspaceMembers } from "@/hooks/useWorkspaces";
import { useProjectMembers, useAddProjectMember } from "@/hooks/useProjects";
import { safeArray } from "@/api/helpers";
import { Check, Loader2, Search, Users } from "lucide-react";
import type { WorkspaceMember, ProjectMember } from "@/types";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string | undefined;
  projectId: string | undefined;
}

export function InvitePeopleModal({
  open,
  onOpenChange,
  workspaceId,
  projectId,
}: Props) {
  const [query, setQuery] = useState("");
  const [pendingId, setPendingId] = useState<string | null>(null);

  const wsMembersQ = useWorkspaceMembers(open ? workspaceId : undefined);
  const projMembersQ = useProjectMembers(open ? projectId : undefined);
  const addMember = useAddProjectMember(projectId ?? "");

  const wsMembers = safeArray<WorkspaceMember>(wsMembersQ.data);
  const projMembers = safeArray<ProjectMember>(projMembersQ.data);

  const addedDisplayIds = useMemo(
    () => new Set(projMembers.map((m) => m.display_id)),
    [projMembers]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return wsMembers;
    return wsMembers.filter(
      (m) =>
        m.name?.toLowerCase().includes(q) ||
        m.email?.toLowerCase().includes(q) ||
        m.display_id?.toLowerCase().includes(q)
    );
  }, [wsMembers, query]);

  const handleAdd = async (m: WorkspaceMember) => {
    if (!projectId || addedDisplayIds.has(m.display_id)) return;
    setPendingId(m.display_id);
    try {
      await addMember.mutateAsync(m.display_id);
    } finally {
      setPendingId(null);
    }
  };

  const isLoading = wsMembersQ.isLoading || projMembersQ.isLoading;
  const isError = wsMembersQ.isError;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Invite people to project</DialogTitle>
          <DialogDescription>
            Add workspace members to this project. Only selected people get
            access.
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, email, or ID"
            className="pl-9"
          />
        </div>

        <div className="max-h-[360px] overflow-y-auto -mx-2 px-2">
          {isLoading ? (
            <div className="space-y-2">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 rounded-lg p-2"
                >
                  <Skeleton className="h-9 w-9 rounded-full" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-3.5 w-32" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                  <Skeleton className="h-8 w-16 rounded-md" />
                </div>
              ))}
            </div>
          ) : isError ? (
            <ErrorState
              title="Couldn't load members"
              message="We couldn't fetch your workspace members. Please try again."
              onRetry={() => wsMembersQ.refetch()}
            />
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={<Users className="h-6 w-6" />}
              title={
                wsMembers.length === 0
                  ? "No workspace members yet"
                  : "No matches"
              }
              message={
                wsMembers.length === 0
                  ? "Invite people to your workspace first, then add them here."
                  : "Try a different search term."
              }
            />
          ) : (
            <ul className="divide-y divide-border">
              {filtered.map((m) => {
                const added = addedDisplayIds.has(m.display_id);
                const pending = pendingId === m.display_id;
                const initials = (m.name || m.email || "?")
                  .split(/\s+/)
                  .map((s) => s[0])
                  .filter(Boolean)
                  .slice(0, 2)
                  .join("")
                  .toUpperCase();
                return (
                  <li
                    key={m.id}
                    className="flex items-center gap-3 py-2.5"
                  >
                    <Avatar className="h-9 w-9">
                      {m.avatar_url && <AvatarImage src={m.avatar_url} />}
                      <AvatarFallback className="text-xs">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">
                        {m.name || m.email}
                      </div>
                      <div className="truncate text-xs text-muted-foreground">
                        {m.email}
                        <span className="ml-2 font-mono opacity-70">
                          {m.display_id}
                        </span>
                      </div>
                    </div>
                    {added ? (
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled
                        className="gap-1"
                      >
                        <Check className="h-3.5 w-3.5" />
                        Added
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => handleAdd(m)}
                        disabled={pending}
                      >
                        {pending ? (
                          <>
                            <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                            Adding
                          </>
                        ) : (
                          "Add"
                        )}
                      </Button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="flex justify-end pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Done
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
