import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { EmptyState, ErrorState } from "@/components/states/StateViews";
import { useUIStore } from "@/stores/ui";
import { useWorkspaceStore } from "@/stores/workspace";
import { InvitePeopleModal } from "@/components/projects/InvitePeopleModal";
import { SkillsAvailabilityModal } from "@/components/projects/SkillsAvailabilityModal";
import { CreateTaskModal } from "@/components/projects/CreateTaskModal";
import {
  useProjectMembers,
  useMyProjectMembership,
  isMembershipIncomplete,
  useRemoveProjectMember,
} from "@/hooks/useProjects";
import { useWorkspacePermissions } from "@/hooks/usePermissions";
import { useMe } from "@/hooks/useAuth";
import { useTasks, useDeleteTask } from "@/hooks/useTasks";
import { SubmitTaskModal } from "@/components/projects/SubmitTaskModal";
import { ReviewTaskModal } from "@/components/projects/ReviewTaskModal";
import { useWorkspaces } from "@/hooks/useWorkspaces";
import { useRunAllocation, useAllocationHistory } from "@/hooks/useAllocation";
import { useAllocationStore } from "@/stores/allocation";
import { safeArray } from "@/api/helpers";
import type {
  ProjectMember,
  Skill,
  Task,
  Workspace,
  AllocationHistoryItem,
  AllocationResult,
  AssignmentResult,
} from "@/types";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import toast from "react-hot-toast";
import {
  ArrowLeft,
  CheckCircle2,
  Users,
  Sparkles,
  MessagesSquare,
  BarChart3,
  ListTodo,
  Lock,
  AlertCircle,
  Trash2,
  Info,
  Send,
  ClipboardCheck,
} from "lucide-react";

const STATUS_BADGE: Record<
  Task["status"],
  { variant: "default" | "secondary" | "destructive" | "outline"; className: string; label: string }
> = {
  PENDING: {
    variant: "outline",
    className: "border-muted-foreground/30 text-muted-foreground",
    label: "Pending",
  },
  ASSIGNED: {
    variant: "secondary",
    className: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-transparent",
    label: "Assigned",
  },
  IN_PROGRESS: {
    variant: "secondary",
    className: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-transparent",
    label: "In progress",
  },
  SUBMITTED: {
    variant: "secondary",
    className: "bg-purple-500/15 text-purple-700 dark:text-purple-400 border-transparent",
    label: "Submitted",
  },
  COMPLETED: {
    variant: "secondary",
    className: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-transparent",
    label: "Completed",
  },
  REJECTED: {
    variant: "destructive",
    className: "",
    label: "Rejected",
  },
};

type TabDef = {
  value: string;
  label: string;
  icon: typeof Sparkles;
  minPlan?: "PRO" | "TEAM";
};

const TABS: TabDef[] = [
  { value: "overview", label: "Overview", icon: Sparkles },
  { value: "tasks", label: "Tasks", icon: ListTodo },
  { value: "team", label: "Team", icon: Users },
  { value: "allocation", label: "Allocation", icon: CheckCircle2 },
  { value: "chat", label: "Chat", icon: MessagesSquare, minPlan: "PRO" },
  { value: "analytics", label: "Analytics", icon: BarChart3, minPlan: "PRO" },
];

const PLAN_RANK = { FREE: 0, PRO: 1, TEAM: 2 } as const;

export default function ProjectPage() {
  const params = useParams();
  const navigate = useNavigate();
  const [tab, setTab] = useState<string>("overview");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [skillsOpen, setSkillsOpen] = useState(false);
  const [taskOpen, setTaskOpen] = useState(false);
  // Tracks whether we've already auto-prompted this session for this project
  const [autoPrompted, setAutoPrompted] = useState(false);
  const openUpgrade = useUIStore((s) => s.openUpgrade);
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);

  const projectId = params.projectId ?? params.id;
  const workspaceId = params.workspaceId ?? activeWorkspaceId ?? undefined;

  const { membership, isLoading: meMembershipLoading } =
    useMyProjectMembership(projectId);
  const myIncomplete = membership ? isMembershipIncomplete(membership) : false;

  // Role-based access control — derived from API only.
  const { isOwner, readOnlyReason } = useWorkspacePermissions(workspaceId);
  const { data: me } = useMe();
  const currentPlan = me?.plan_tier ?? "FREE";

  // Live data needed for allocation gating
  const tasksQ = useTasks(projectId);
  const membersQ = useProjectMembers(projectId);
  const memberCount = safeArray<ProjectMember>(membersQ.data).length;
  const pendingTaskCount = safeArray<Task>(tasksQ.data).filter(
    (t) => t.status === "PENDING"
  ).length;

  const runAllocation = useRunAllocation(projectId ?? "");
  const historyQ = useAllocationHistory(projectId);
  const latestResult = useAllocationStore((s) => s.latestResult);

  // Auto-trigger skills modal when current user's membership lacks skills/availability.
  useEffect(() => {
    if (
      !autoPrompted &&
      !meMembershipLoading &&
      membership &&
      myIncomplete &&
      !skillsOpen
    ) {
      setSkillsOpen(true);
      setAutoPrompted(true);
    }
  }, [autoPrompted, meMembershipLoading, membership, myIncomplete, skillsOpen]);

  // Reset prompt flag when switching projects
  useEffect(() => {
    setAutoPrompted(false);
  }, [projectId]);

  const allocationBlockReason: string | null = (() => {
    if (!projectId) return "Project not loaded";
    if (!isOwner) return readOnlyReason;
    if (myIncomplete) return "Set your skills and availability first";
    if (memberCount === 0) return "Add team members before running allocation";
    if (pendingTaskCount === 0)
      return "Add pending tasks before running allocation";
    return null;
  })();

  const handleRunAllocation = () => {
    if (!isOwner) {
      toast.error(readOnlyReason);
      return;
    }
    if (myIncomplete) {
      setSkillsOpen(true);
      return;
    }
    if (allocationBlockReason) {
      toast.error(allocationBlockReason);
      return;
    }
    runAllocation.mutate();
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6 md:p-10">
      <div>
        <button
          onClick={() => navigate(-1)}
          className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back
        </button>
        <h1 className="text-3xl font-bold tracking-tight">Project</h1>
        <p className="mt-1 font-mono text-xs text-muted-foreground">{projectId}</p>
      </div>

      {membership && myIncomplete && (
        <div
          role="alert"
          className="flex flex-col gap-3 rounded-2xl border border-destructive/30 bg-destructive/10 p-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex items-start gap-3">
            <div className="mt-0.5 rounded-full bg-destructive/20 p-2 text-destructive">
              <AlertCircle className="h-4 w-4" />
            </div>
            <div>
              <div className="text-sm font-semibold">
                Complete your profile to enable allocation
              </div>
              <p className="text-sm text-muted-foreground">
                Add at least one skill and your weekly availability so Allocra
                can assign tasks to you.
              </p>
            </div>
          </div>
          <Button onClick={() => setSkillsOpen(true)}>Set up</Button>
        </div>
      )}

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid w-full grid-cols-3 sm:grid-cols-6">
          {TABS.map((t) => {
            const locked =
              !!t.minPlan && PLAN_RANK[currentPlan] < PLAN_RANK[t.minPlan];
            const trigger = (
              <TabsTrigger
                key={t.value}
                value={t.value}
                onClick={(e) => {
                  if (locked) {
                    e.preventDefault();
                    openUpgrade({
                      error: "plan_required",
                      message: `${t.label} requires the ${t.minPlan} plan. Upgrade to unlock.`,
                      current: currentPlan,
                      required: t.minPlan,
                    });
                  }
                }}
              >
                <t.icon className="mr-1.5 h-3.5 w-3.5" />
                <span className="hidden sm:inline">{t.label}</span>
                {locked && <Lock className="ml-1 h-3 w-3 opacity-60" />}
              </TabsTrigger>
            );
            if (!locked) return trigger;
            return (
              <Tooltip key={t.value}>
                <TooltipTrigger asChild>{trigger}</TooltipTrigger>
                <TooltipContent>
                  Upgrade to {t.minPlan} to access this feature
                </TooltipContent>
              </Tooltip>
            );
          })}
        </TabsList>

        <TabsContent value="overview" className="mt-6 space-y-4">
          <ProjectOverviewTab projectId={projectId} />
        </TabsContent>

        <TabsContent value="tasks" className="mt-6">
          <ProjectTasksTab
            projectId={projectId}
            myIncomplete={myIncomplete}
            isOwner={isOwner}
            readOnlyReason={readOnlyReason}
            onCreate={() => {
              if (!isOwner) {
                toast.error(readOnlyReason);
                return;
              }
              if (myIncomplete) {
                toast.error("Set your skills and availability first.");
                setSkillsOpen(true);
                return;
              }
              setTaskOpen(true);
            }}
          />
        </TabsContent>

        <TabsContent value="team" className="mt-6">
          <ProjectTeamTab
            projectId={projectId}
            workspaceId={workspaceId}
            myDisplayId={membership?.display_id ?? null}
            isOwner={isOwner}
            onInvite={() => {
              if (!isOwner) {
                toast.error(readOnlyReason);
                return;
              }
              setInviteOpen(true);
            }}
            onEditMySkills={() => setSkillsOpen(true)}
          />
        </TabsContent>

        <TabsContent value="allocation" className="mt-6 space-y-4">
          <Card className="p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <Badge variant="secondary" className="mb-2">
                  AI
                </Badge>
                <h3 className="text-lg font-semibold">Smart allocation</h3>
                <p className="text-sm text-muted-foreground">
                  Let Allocra balance work across your team in one click.
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {pendingTaskCount} pending {pendingTaskCount === 1 ? "task" : "tasks"} ·{" "}
                  {memberCount} {memberCount === 1 ? "member" : "members"}
                </p>
              </div>
              {isOwner ? (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span>
                        <Button
                          onClick={handleRunAllocation}
                          disabled={
                            !!allocationBlockReason || runAllocation.isPending
                          }
                        >
                          <Sparkles className="mr-1.5 h-4 w-4" />
                          {runAllocation.isPending ? "Running..." : "Run allocation"}
                        </Button>
                      </span>
                    </TooltipTrigger>
                    {allocationBlockReason && (
                      <TooltipContent>{allocationBlockReason}</TooltipContent>
                    )}
                  </Tooltip>
                </TooltipProvider>
              ) : (
                <ReadOnlyHint />
              )}
            </div>
            {isOwner && allocationBlockReason && !myIncomplete && (
              <p className="mt-3 text-xs text-muted-foreground">
                {allocationBlockReason}.
              </p>
            )}
          </Card>

          <AllocationResultsPanel
            result={latestResult}
            history={historyQ.data}
            historyLoading={historyQ.isLoading}
          />
        </TabsContent>
      </Tabs>

      <InvitePeopleModal
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        workspaceId={workspaceId}
        projectId={projectId}
      />

      <SkillsAvailabilityModal
        open={skillsOpen}
        onOpenChange={setSkillsOpen}
        projectId={projectId}
        initialSkills={membership?.skills ?? []}
        initialAvailability={membership?.available_hours ?? 0}
        blocking={myIncomplete}
      />

      <CreateTaskModal
        open={taskOpen}
        onOpenChange={setTaskOpen}
        projectId={projectId}
      />
    </div>
  );
}

function ProjectOverviewTab({ projectId }: { projectId: string | undefined }) {
  const tasksQ = useTasks(projectId);
  const membersQ = useProjectMembers(projectId);

  const isLoading = tasksQ.isLoading || membersQ.isLoading;
  const isError = tasksQ.isError || membersQ.isError;

  if (isError) {
    return (
      <ErrorState
        title="Couldn't load overview"
        message="There was a problem loading project data."
        onRetry={() => {
          tasksQ.refetch();
          membersQ.refetch();
        }}
      />
    );
  }

  const tasks = safeArray<Task>(tasksQ.data);
  const members = safeArray<ProjectMember>(membersQ.data);

  const openTasks = tasks.filter((t) => t.status !== "COMPLETED").length;
  const completedTasks = tasks.filter((t) => t.status === "COMPLETED").length;
  const completionRate =
    tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0;

  const avgLoad =
    members.length > 0
      ? Math.round(
          members.reduce((acc, m) => acc + (m.load_percent ?? 0), 0) /
            members.length
        )
      : 0;

  // Build a real activity feed from the data we have.
  type Activity = {
    id: string;
    icon: typeof ListTodo;
    text: string;
    timestamp: string;
  };
  const activity: Activity[] = [];
  for (const t of tasks) {
    activity.push({
      id: `task-created-${t.id}`,
      icon: ListTodo,
      text: `Task "${t.title}" created`,
      timestamp: t.created_at,
    });
    if (t.status === "ASSIGNED" && t.assignee_name && t.updated_at) {
      activity.push({
        id: `task-assigned-${t.id}`,
        icon: CheckCircle2,
        text: `"${t.title}" assigned to ${t.assignee_name}`,
        timestamp: t.updated_at,
      });
    }
    if (t.status === "COMPLETED" && t.updated_at) {
      activity.push({
        id: `task-done-${t.id}`,
        icon: CheckCircle2,
        text: `"${t.title}" completed${t.assignee_name ? ` by ${t.assignee_name}` : ""}`,
        timestamp: t.updated_at,
      });
    }
  }
  for (const m of members) {
    activity.push({
      id: `member-joined-${m.id}`,
      icon: Users,
      text: `${m.name} joined the project`,
      timestamp: m.joined_at,
    });
  }
  activity.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
  const recent = activity.slice(0, 8);

  return (
    <>
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Card key={i} className="p-6">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="mt-3 h-8 w-16" />
              <Skeleton className="mt-3 h-2 w-full" />
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="p-6">
            <div className="text-xs uppercase tracking-widest text-muted-foreground">
              Open tasks
            </div>
            <div className="mt-2 text-3xl font-bold">{openTasks}</div>
            <div className="mt-1 text-xs text-muted-foreground">
              {tasks.length === 0
                ? "No tasks yet"
                : `${completedTasks} of ${tasks.length} completed`}
            </div>
          </Card>
          <Card className="p-6">
            <div className="text-xs uppercase tracking-widest text-muted-foreground">
              Team load
            </div>
            <div className="mt-2 text-3xl font-bold">{avgLoad}%</div>
            <Progress value={Math.min(avgLoad, 100)} className="mt-3 h-2" />
            <div className="mt-1 text-xs text-muted-foreground">
              {members.length === 0
                ? "No members yet"
                : `Across ${members.length} ${members.length === 1 ? "member" : "members"}`}
            </div>
          </Card>
          <Card className="p-6">
            <div className="text-xs uppercase tracking-widest text-muted-foreground">
              Completion rate
            </div>
            <div className="mt-2 text-3xl font-bold">{completionRate}%</div>
            <Progress value={completionRate} className="mt-3 h-2" />
            <div className="mt-1 text-xs text-muted-foreground">
              {completedTasks} completed
            </div>
          </Card>
        </div>
      )}

      <Card className="p-6">
        <h3 className="text-lg font-semibold">Recent activity</h3>
        {isLoading ? (
          <div className="mt-4 space-y-3">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="flex-1 space-y-1">
                  <Skeleton className="h-3 w-2/3" />
                  <Skeleton className="h-2 w-24" />
                </div>
              </div>
            ))}
          </div>
        ) : recent.length === 0 ? (
          <EmptyState
            title="No activity yet"
            message="Activity will appear here as your team works."
          />
        ) : (
          <ul className="mt-4 space-y-3">
            {recent.map((a) => (
              <li key={a.id} className="flex items-start gap-3">
                <div className="rounded-full bg-accent p-2 text-accent-foreground">
                  <a.icon className="h-3.5 w-3.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm">{a.text}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatRelativeTime(a.timestamp)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}

function formatRelativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return "";
  const diffSec = Math.max(0, Math.round((Date.now() - then) / 1000));
  if (diffSec < 60) return "just now";
  const diffMin = Math.round(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.round(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d ago`;
  return new Date(iso).toLocaleDateString();
}

function ProjectTasksTab({
  projectId,
  myIncomplete,
  isOwner,
  readOnlyReason,
  onCreate,
}: {
  projectId: string | undefined;
  myIncomplete: boolean;
  isOwner: boolean;
  readOnlyReason: string;
  onCreate: () => void;
}) {
  const tasksQ = useTasks(projectId);
  const tasks = safeArray<Task>(tasksQ.data);
  const deleteTask = useDeleteTask(projectId ?? "");
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [submitTask, setSubmitTask] = useState<Task | null>(null);
  const [reviewTask, setReviewTask] = useState<Task | null>(null);
  const { data: me } = useMe();
  const myUserId = me?.id ?? null;

  const createDisabled = myIncomplete;
  const createDisabledReason = myIncomplete
    ? "Set your skills and availability first"
    : null;

  if (tasksQ.isLoading) {
    return (
      <Card className="divide-y divide-border p-2">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex items-center gap-3 p-3">
            <Skeleton className="h-4 w-4 rounded" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-3.5 w-48" />
              <Skeleton className="h-3 w-32" />
            </div>
          </div>
        ))}
      </Card>
    );
  }

  if (tasksQ.isError) {
    return (
      <ErrorState
        title="Couldn't load tasks"
        message="We couldn't fetch tasks for this project."
        onRetry={() => tasksQ.refetch()}
      />
    );
  }

  if (tasks.length === 0) {
    return (
      <EmptyState
        icon={<ListTodo className="h-6 w-6" />}
        title="No tasks yet"
        message={
          isOwner
            ? "Create your first task to get started."
            : "Only project owners can manage tasks and allocation."
        }
        action={
          isOwner ? (
            <CreateTaskButton
              disabled={createDisabled}
              reason={createDisabledReason}
              onClick={onCreate}
            />
          ) : undefined
        }
      />
    );
  }

  const priorityVariant: Record<string, "default" | "secondary" | "destructive"> = {
    HIGH: "destructive",
    MEDIUM: "default",
    LOW: "secondary",
  };

  const taskToDelete = tasks.find((t) => t.id === confirmId) ?? null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Tasks</h3>
          <p className="text-sm text-muted-foreground">
            {tasks.length} {tasks.length === 1 ? "task" : "tasks"}
          </p>
        </div>
        {isOwner && (
          <CreateTaskButton
            disabled={createDisabled}
            reason={createDisabledReason}
            onClick={onCreate}
          />
        )}
      </div>
      {!isOwner && <ReadOnlyHint />}
      <Card className="divide-y divide-border">
        {tasks.map((t) => {
          const status = STATUS_BADGE[t.status] ?? {
            variant: "outline" as const,
            className: "",
            label: t.status,
          };
          const isAssignedToMe =
            !!myUserId && !!t.assigned_to && t.assigned_to === myUserId;
          // Members can submit when assigned to them and status allows.
          const canSubmit =
            !isOwner &&
            isAssignedToMe &&
            (t.status === "ASSIGNED" ||
              t.status === "IN_PROGRESS" ||
              t.status === "REJECTED");
          // Owners can review when work is submitted.
          const canReview = isOwner && t.status === "SUBMITTED";

          return (
            <div key={t.id} className="flex items-start gap-3 p-4">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="truncate text-sm font-medium">{t.title}</span>
                  <Badge
                    variant={priorityVariant[t.priority] ?? "secondary"}
                    className="text-[10px]"
                  >
                    {t.priority}
                  </Badge>
                  <Badge
                    variant={status.variant}
                    className={`text-[10px] ${status.className}`}
                  >
                    {status.label}
                  </Badge>
                </div>
                {t.description && (
                  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                    {t.description}
                  </p>
                )}
                <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
                  <span>Skill: {t.required_skill}</span>
                  <span>~{t.estimated_hours}h</span>
                  {t.assignee_name && <span>Assigned: {t.assignee_name}</span>}
                </div>
                {t.status === "REJECTED" && t.review?.feedback && (
                  <div className="mt-2 rounded-md border border-destructive/30 bg-destructive/10 px-2.5 py-1.5 text-[11px] text-destructive">
                    Rejected: {t.review.feedback}
                  </div>
                )}
                {t.status === "COMPLETED" && t.review?.feedback && (
                  <div className="mt-2 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1.5 text-[11px] text-emerald-700 dark:text-emerald-400">
                    Approved: {t.review.feedback}
                  </div>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-1">
                {canSubmit && (
                  <Button
                    size="sm"
                    variant="default"
                    className="h-8"
                    onClick={() => setSubmitTask(t)}
                  >
                    <Send className="mr-1.5 h-3.5 w-3.5" />
                    {t.status === "REJECTED" ? "Resubmit" : "Submit work"}
                  </Button>
                )}
                {canReview && (
                  <Button
                    size="sm"
                    variant="default"
                    className="h-8"
                    onClick={() => setReviewTask(t)}
                  >
                    <ClipboardCheck className="mr-1.5 h-3.5 w-3.5" />
                    Review
                  </Button>
                )}
                {isOwner && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 px-2 text-muted-foreground hover:text-destructive"
                    onClick={() => setConfirmId(t.id)}
                    aria-label={`Delete task ${t.title}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </Card>

      <AlertDialog
        open={!!confirmId}
        onOpenChange={(o) => !o && setConfirmId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this task?</AlertDialogTitle>
            <AlertDialogDescription>
              {taskToDelete
                ? `“${taskToDelete.title}” will be permanently removed. This cannot be undone.`
                : "Are you sure you want to delete this task?"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteTask.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={deleteTask.isPending}
              onClick={(e) => {
                e.preventDefault();
                if (!confirmId) return;
                deleteTask.mutate(confirmId, {
                  onSuccess: () => setConfirmId(null),
                });
              }}
            >
              {deleteTask.isPending ? "Deleting..." : "Delete task"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <SubmitTaskModal
        open={!!submitTask}
        onOpenChange={(o) => !o && setSubmitTask(null)}
        task={submitTask}
        projectId={projectId ?? ""}
      />

      <ReviewTaskModal
        open={!!reviewTask}
        onOpenChange={(o) => !o && setReviewTask(null)}
        task={reviewTask}
        projectId={projectId ?? ""}
      />
    </div>
  );
}

function MemberSkillChips({ skills }: { skills: Skill[] }) {
  const list = safeArray<Skill>(skills);
  if (list.length === 0) return null;
  const visible = list.slice(0, 4);
  const extra = list.length - visible.length;
  return (
    <div className="mt-1.5 flex flex-wrap items-center gap-1">
      {visible.map((s) => (
        <span
          key={s.name}
          className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/40 px-2 py-0.5 text-[11px]"
        >
          <span className="truncate max-w-[140px]">{s.name}</span>
          <span className="flex items-center gap-0.5">
            {[1, 2, 3, 4, 5].map((lvl) => (
              <span
                key={lvl}
                className={`h-1 w-1 rounded-full ${
                  lvl <= s.level ? "bg-primary" : "bg-muted-foreground/30"
                }`}
              />
            ))}
          </span>
        </span>
      ))}
      {extra > 0 && (
        <span className="text-[11px] text-muted-foreground">+{extra} more</span>
      )}
    </div>
  );
}

function ProjectTeamTab({
  projectId,
  workspaceId,
  myDisplayId,
  isOwner,
  onInvite,
  onEditMySkills,
}: {
  projectId: string | undefined;
  workspaceId: string | undefined;
  myDisplayId: string | null;
  isOwner: boolean;
  onInvite: () => void;
  onEditMySkills: () => void;
}) {
  const membersQ = useProjectMembers(projectId);
  const members = safeArray<ProjectMember>(membersQ.data);
  const removeMember = useRemoveProjectMember(projectId ?? "");
  const workspacesQ = useWorkspaces();
  const workspaces = safeArray<Workspace>(workspacesQ.data);
  const workspace = workspaces.find((w) => w.id === workspaceId);
  const workspaceCreatorId = workspace?.creator_id ?? null;

  const [confirmRemove, setConfirmRemove] = useState<ProjectMember | null>(
    null
  );

  if (membersQ.isLoading) {
    return (
      <Card className="divide-y divide-border p-2">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex items-center gap-3 p-3">
            <Skeleton className="h-9 w-9 rounded-full" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-3.5 w-32" />
              <Skeleton className="h-3 w-48" />
            </div>
          </div>
        ))}
      </Card>
    );
  }

  if (membersQ.isError) {
    return (
      <ErrorState
        title="Couldn't load team"
        message="We couldn't fetch project members. Please try again."
        onRetry={() => membersQ.refetch()}
      />
    );
  }

  if (members.length === 0) {
    return (
      <EmptyState
        icon={<Users className="h-6 w-6" />}
        title="Invite your team"
        message={
          isOwner
            ? "Add teammates to start allocating work."
            : "Only project owners can manage tasks and allocation."
        }
        action={
          isOwner ? (
            <Button onClick={onInvite}>Invite people</Button>
          ) : undefined
        }
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Team members</h3>
          <p className="text-sm text-muted-foreground">
            {members.length} {members.length === 1 ? "person" : "people"} on this project
          </p>
        </div>
        {isOwner && <Button onClick={onInvite}>Invite people</Button>}
      </div>
      {!isOwner && <ReadOnlyHint />}
      <Card className="divide-y divide-border">
        {members.map((m) => {
          const initials = (m.name || m.email || "?")
            .split(/\s+/)
            .map((s) => s[0])
            .filter(Boolean)
            .slice(0, 2)
            .join("")
            .toUpperCase();
          const isMe = !!myDisplayId && m.display_id === myDisplayId;
          const incomplete = isMembershipIncomplete(m);
          const isWorkspaceOwner =
            !!workspaceCreatorId && m.user_id === workspaceCreatorId;
          const canRemove = isOwner && !isMe && !isWorkspaceOwner;
          return (
            <div
              key={m.id}
              className="flex items-start gap-3 p-4 sm:items-center"
            >
              <Avatar className="h-9 w-9 shrink-0">
                {m.avatar_url && <AvatarImage src={m.avatar_url} />}
                <AvatarFallback className="text-xs">{initials}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="truncate text-sm font-medium">
                    {m.name || m.email}
                  </span>
                  {isMe && (
                    <Badge variant="secondary" className="text-[10px]">
                      You
                    </Badge>
                  )}
                  {isWorkspaceOwner && (
                    <Badge variant="outline" className="text-[10px]">
                      Owner
                    </Badge>
                  )}
                </div>
                <div className="truncate text-xs text-muted-foreground">
                  {m.email}
                  <span className="ml-2 font-mono opacity-70">
                    {m.display_id}
                  </span>
                </div>
                {incomplete ? (
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                      <AlertCircle className="h-3 w-3" />
                      This member has not set up skills yet
                    </span>
                    {isMe && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs"
                        onClick={onEditMySkills}
                      >
                        Set skills
                      </Button>
                    )}
                  </div>
                ) : (
                  <MemberSkillChips skills={m.skills} />
                )}
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                {typeof m.load_percent === "number" && (
                  <Badge variant="secondary" className="font-mono text-xs">
                    {Math.round(m.load_percent)}%
                  </Badge>
                )}
                {m.available_hours > 0 && (
                  <span className="text-[10px] text-muted-foreground">
                    {m.available_hours}h/wk
                  </span>
                )}
                <div className="flex items-center gap-1">
                  {isMe && !incomplete && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs"
                      onClick={onEditMySkills}
                    >
                      Edit
                    </Button>
                  )}
                  {canRemove && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-muted-foreground hover:text-destructive"
                      onClick={() => setConfirmRemove(m)}
                      aria-label={`Remove ${m.name || m.email}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </Card>

      <AlertDialog
        open={!!confirmRemove}
        onOpenChange={(o) => !o && setConfirmRemove(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this member?</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmRemove
                ? `${confirmRemove.name || confirmRemove.email} will lose access to this project. You can re-invite them later.`
                : "Are you sure?"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={removeMember.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={removeMember.isPending}
              onClick={(e) => {
                e.preventDefault();
                if (!confirmRemove) return;
                removeMember.mutate(confirmRemove.id, {
                  onSuccess: () => setConfirmRemove(null),
                });
              }}
            >
              {removeMember.isPending ? "Removing..." : "Remove"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function ReadOnlyHint() {
  return (
    <div className="inline-flex items-center gap-2 rounded-md border border-border bg-muted/40 px-3 py-1.5 text-xs text-muted-foreground">
      <Info className="h-3.5 w-3.5" />
      Only project owners can manage tasks and allocation
    </div>
  );
}

function AllocationResultsPanel({
  result,
  history,
  historyLoading,
}: {
  result: AllocationResult | null;
  history: AllocationHistoryItem[] | undefined;
  historyLoading: boolean;
}) {
  const historyList = safeArray<AllocationHistoryItem>(history);

  if (!result && historyList.length === 0 && !historyLoading) {
    return (
      <EmptyState
        title="No allocations yet"
        message="Run allocation to assign pending tasks based on skills, availability and load."
      />
    );
  }

  return (
    <div className="space-y-4">
      {result && (
        <Card className="p-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-lg font-semibold">Latest run</h3>
            <span className="text-xs text-muted-foreground">
              {new Date(result.created_at).toLocaleString()}
            </span>
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-4">
            <Stat label="Assigned" value={`${result.assigned}/${result.total_tasks}`} />
            <Stat label="Unassigned" value={String(result.unassigned)} />
            <Stat
              label="Avg score"
              value={result.avg_score?.toFixed?.(2) ?? String(result.avg_score)}
            />
            <Stat
              label="Suggestions"
              value={String(safeArray(result.optimization_suggestions).length)}
            />
          </div>

          {safeArray<AssignmentResult>(result.assignments).length > 0 && (
            <div className="mt-5 space-y-2">
              <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Assignments
              </div>
              <div className="divide-y divide-border rounded-md border border-border">
                {safeArray<AssignmentResult>(result.assignments).map((a) => (
                  <div
                    key={a.task_id}
                    className="flex items-start justify-between gap-3 p-3 text-sm"
                  >
                    <div className="min-w-0">
                      <div className="truncate font-medium">{a.task_title}</div>
                      <div className="text-xs text-muted-foreground">
                        {a.assigned_to_name ?? "Unassigned"} · score{" "}
                        {a.score?.toFixed?.(2) ?? a.score}
                      </div>
                    </div>
                    <Badge
                      variant={
                        a.risk_level === "HIGH"
                          ? "destructive"
                          : a.risk_level === "MEDIUM"
                            ? "default"
                            : "secondary"
                      }
                      className="text-[10px]"
                    >
                      {a.risk_level}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {safeArray<{ task_id: string; task_title: string; reason: string }>(result.unassigned_tasks).length > 0 && (
            <div className="mt-5 space-y-2">
              <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Unassigned
              </div>
              <div className="divide-y divide-border rounded-md border border-border">
                {safeArray<{ task_id: string; task_title: string; reason: string }>(result.unassigned_tasks).map((u) => (
                  <div
                    key={u.task_id}
                    className="flex items-start justify-between gap-3 p-3 text-sm"
                  >
                    <span className="truncate">{u.task_title}</span>
                    <span className="text-xs text-muted-foreground">
                      {u.reason}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
      )}

      <Card className="p-6">
        <h3 className="text-lg font-semibold">History</h3>
        {historyLoading ? (
          <div className="mt-3 space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        ) : historyList.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">
            No previous runs.
          </p>
        ) : (
          <div className="mt-3 divide-y divide-border rounded-md border border-border">
            {historyList.map((h) => (
              <div
                key={h.id}
                className="flex items-center justify-between gap-3 p-3 text-sm"
              >
                <div className="min-w-0">
                  <div className="truncate font-medium">
                    {h.assigned_count}/{h.task_count} assigned
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(h.created_at).toLocaleString()}
                  </div>
                </div>
                <div className="text-xs text-muted-foreground">
                  avg {h.avg_score?.toFixed?.(2) ?? h.avg_score}
                  {h.top_risk ? ` · risk ${h.top_risk}` : ""}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border p-3">
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 text-xl font-semibold">{value}</div>
    </div>
  );
}

function CreateTaskButton({
  disabled,
  reason,
  onClick,
}: {
  disabled: boolean;
  reason: string | null;
  onClick: () => void;
}) {
  const button = (
    <Button disabled={disabled} onClick={onClick}>
      Create task
    </Button>
  );
  if (!disabled || !reason) return button;
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span>{button}</span>
        </TooltipTrigger>
        <TooltipContent>{reason}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
