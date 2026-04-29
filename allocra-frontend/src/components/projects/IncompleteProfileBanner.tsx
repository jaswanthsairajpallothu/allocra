import { useMemo, useState } from "react";
import { useQueries } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useWorkspaces } from "@/hooks/useWorkspaces";
import { useMe } from "@/hooks/useAuth";
import { projectApi } from "@/api/endpoints";
import { safeArray } from "@/api/helpers";
import { isMembershipIncomplete } from "@/hooks/useProjects";
import { SkillsAvailabilityModal } from "./SkillsAvailabilityModal";
import { AlertTriangle, ChevronRight } from "lucide-react";
import type { Project, ProjectMember, Workspace } from "@/types";

interface IncompleteEntry {
  workspace: Workspace;
  project: Project;
  membership: ProjectMember;
}

/**
 * Surfaces a blocking banner whenever the current user has at least one
 * project membership without skills or availability — required by allocation.
 *
 * Scope: when `workspaceId` is provided, restrict to that workspace.
 * Otherwise scan every workspace the user belongs to.
 */
export function IncompleteProfileBanner({
  workspaceId,
}: {
  workspaceId?: string;
}) {
  const navigate = useNavigate();
  const meQ = useMe();
  const wsQ = useWorkspaces();
  const [activeEntry, setActiveEntry] = useState<IncompleteEntry | null>(null);

  const workspaces = useMemo(() => {
    const all = safeArray<Workspace>(wsQ.data);
    return workspaceId ? all.filter((w) => w.id === workspaceId) : all;
  }, [wsQ.data, workspaceId]);

  // Fetch projects for each workspace in parallel.
  const projectQueries = useQueries({
    queries: workspaces.map((w) => ({
      queryKey: ["projects", w.id],
      enabled: !!w.id,
      queryFn: async (): Promise<Project[]> => {
        const res = await projectApi.list(w.id);
        return safeArray<Project>(res.data);
      },
    })),
  });

  const projectsFlat = useMemo(() => {
    const out: { workspace: Workspace; project: Project }[] = [];
    workspaces.forEach((w, i) => {
      const projs = safeArray<Project>(projectQueries[i]?.data);
      projs.forEach((p) => out.push({ workspace: w, project: p }));
    });
    return out;
  }, [workspaces, projectQueries]);

  // Fetch members for each project in parallel.
  const memberQueries = useQueries({
    queries: projectsFlat.map(({ project }) => ({
      queryKey: ["project-members", project.id],
      enabled: !!project.id,
      queryFn: async (): Promise<ProjectMember[]> => {
        const res = await projectApi.listMembers(project.id);
        return safeArray<ProjectMember>(res.data);
      },
    })),
  });

  const incomplete = useMemo<IncompleteEntry[]>(() => {
    const me = meQ.data;
    if (!me) return [];
    const out: IncompleteEntry[] = [];
    projectsFlat.forEach(({ workspace, project }, i) => {
      const members = safeArray<ProjectMember>(memberQueries[i]?.data);
      const mine = members.find(
        (m) =>
          m.display_id === me.display_id ||
          (me.id && m.user_id === me.id)
      );
      if (mine && isMembershipIncomplete(mine)) {
        out.push({ workspace, project, membership: mine });
      }
    });
    return out;
  }, [projectsFlat, memberQueries, meQ.data]);

  if (incomplete.length === 0) return null;

  const first = incomplete[0];
  const more = incomplete.length - 1;

  return (
    <>
      <div
        role="alert"
        className="rounded-2xl border border-destructive/30 bg-destructive/10 p-4 sm:p-5"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 rounded-full bg-destructive/20 p-2 text-destructive">
              <AlertTriangle className="h-4 w-4" />
            </div>
            <div>
              <div className="text-sm font-semibold text-foreground">
                Complete your profile to enable allocation
              </div>
              <p className="mt-0.5 text-sm text-muted-foreground">
                You're missing skills or availability on{" "}
                <button
                  type="button"
                  onClick={() =>
                    navigate(
                      `/workspaces/${first.workspace.id}/projects/${first.project.id}`
                    )
                  }
                  className="font-medium text-foreground underline-offset-2 hover:underline"
                >
                  {first.project.name}
                </button>
                {more > 0 && (
                  <>
                    {" "}
                    and{" "}
                    <span className="font-medium text-foreground">
                      {more} other {more === 1 ? "project" : "projects"}
                    </span>
                  </>
                )}
                . Allocation can't run until this is set.
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveEntry(first)}
              className="inline-flex items-center gap-1 rounded-md bg-foreground px-3 py-1.5 text-xs font-medium text-background transition-opacity hover:opacity-90"
            >
              Set up now
              <ChevronRight className="h-3 w-3" />
            </button>
          </div>
        </div>

        {incomplete.length > 1 && (
          <ul className="mt-3 space-y-1 border-t border-destructive/20 pt-3 text-xs">
            {incomplete.slice(1, 4).map((entry) => (
              <li
                key={entry.project.id}
                className="flex items-center justify-between gap-2"
              >
                <span className="truncate text-muted-foreground">
                  <span className="text-foreground">{entry.project.name}</span>{" "}
                  · {entry.workspace.name}
                </span>
                <button
                  type="button"
                  onClick={() => setActiveEntry(entry)}
                  className="shrink-0 text-foreground underline-offset-2 hover:underline"
                >
                  Set up
                </button>
              </li>
            ))}
            {incomplete.length > 4 && (
              <li className="text-muted-foreground">
                +{incomplete.length - 4} more
              </li>
            )}
          </ul>
        )}
      </div>

      <SkillsAvailabilityModal
        open={!!activeEntry}
        onOpenChange={(o) => !o && setActiveEntry(null)}
        projectId={activeEntry?.project.id}
        initialSkills={activeEntry?.membership.skills ?? []}
        initialAvailability={activeEntry?.membership.available_hours ?? 0}
      />
    </>
  );
}
