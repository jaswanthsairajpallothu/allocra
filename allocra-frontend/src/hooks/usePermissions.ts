import { useMemo } from "react";
import { useMe } from "@/hooks/useAuth";
import { useWorkspaces, useWorkspaceMembers } from "@/hooks/useWorkspaces";
import { safeArray } from "@/api/helpers";
import type { Workspace, WorkspaceMember } from "@/types";

/**
 * Derives the current user's permissions for a given workspace.
 *
 * Per backend contract, a user is treated as an "owner" (full control) if:
 *   - they created the workspace (`workspace.creator_id === user.id`), OR
 *   - they are flagged as a workspace admin (`workspace_member.is_admin === true`).
 *
 * All other workspace members are READ-ONLY: they can see tasks, team and
 * allocation results, but cannot create tasks, invite people, or run allocation.
 *
 * Never derived from local state or hardcoded — always from API data.
 */
export interface WorkspacePermissions {
  isLoading: boolean;
  isOwner: boolean;
  /** Reason text suitable for tooltips/disabled buttons when !isOwner. */
  readOnlyReason: string;
}

export function useWorkspacePermissions(
  workspaceId: string | undefined
): WorkspacePermissions {
  const meQ = useMe();
  const workspacesQ = useWorkspaces();
  const membersQ = useWorkspaceMembers(workspaceId);

  const isLoading =
    meQ.isLoading || workspacesQ.isLoading || membersQ.isLoading;

  const isOwner = useMemo(() => {
    const me = meQ.data;
    if (!me || !workspaceId) return false;

    const workspaces = safeArray<Workspace>(workspacesQ.data);
    const ws = workspaces.find((w) => w.id === workspaceId);
    if (ws?.creator_id && ws.creator_id === me.id) return true;

    const members = safeArray<WorkspaceMember>(membersQ.data);
    const myMembership = members.find(
      (m) => m.user_id === me.id || m.display_id === me.display_id
    );
    if (myMembership?.is_admin) return true;

    return false;
  }, [meQ.data, workspacesQ.data, membersQ.data, workspaceId]);

  return {
    isLoading,
    isOwner,
    readOnlyReason: "Only project owner can perform this action",
  };
}
