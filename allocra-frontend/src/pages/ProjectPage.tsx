import { useState } from "react";
import { useParams, useLocation, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import api from "@/api/client";
import { useQueryClient } from "@tanstack/react-query";
import { useAllocationStore } from "@/stores/allocation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LoadBar } from "@/components/shared/LoadBar";
import { RiskBadge } from "@/components/shared/RiskBadge";
import { ScoreBar } from "@/components/shared/ScoreBar";
import { SkillTag } from "@/components/shared/SkillTag";
import { EmptyState } from "@/components/shared/EmptyState";
import { StatCard } from "@/components/shared/StatCard";
import { ConfirmModal } from "@/components/shared/ConfirmModal";
import { toast } from "@/hooks/use-toast";
import {
  CheckSquare, Users, Zap, MessageSquare, BarChart3,
  PlusCircle, Trash2, Edit, Send, Smile, Lock
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";


type Tab = "tasks" | "team" | "allocate" | "chat" | "analytics";

export default function ProjectPage() {
  const { workspaceId, projectId } = useParams<{ workspaceId: string; projectId: string }>();
  const queryClient = useQueryClient();
  const { setResult: setAllocationResult, latestResult } = useAllocationStore();

  const [tab, setTab] = useState<Tab>("tasks");
  const [createTaskOpen, setCreateTaskOpen] = useState(false);
  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [deleteTaskId, setDeleteTaskId] = useState<string | null>(null);

  const { data: project, isLoading } = useQuery({
  queryKey: ["project", projectId],
  enabled: !!projectId,
  queryFn: async () => (await api.get(`/projects/${projectId}`)).data,
});

const { data: stats } = useQuery({
  queryKey: ["project-stats", projectId],
  enabled: !!projectId,
  queryFn: async () => (await api.get(`/projects/${projectId}/stats`)).data,
});

const { data: teamLoad } = useQuery({
  queryKey: ["team-load", projectId],
  enabled: !!projectId,
  queryFn: async () => (await api.get(`/projects/${projectId}/team-load`)).data,
});

  if (!projectId || !workspaceId) return null;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const tabs = [
    { id: "tasks" as Tab, label: "Tasks", icon: CheckSquare, plan: null },
    { id: "team" as Tab, label: "Team", icon: Users, plan: null },
    { id: "allocate" as Tab, label: "Allocate", icon: Zap, plan: null },
    { id: "chat" as Tab, label: "Chat", icon: MessageSquare, plan: "PRO" },
    { id: "analytics" as Tab, label: "Analytics", icon: BarChart3, plan: "TEAM" },
  ];

  return (
    <div className="flex flex-col h-full">
      <div className="border-b border-border bg-card/50 px-6 pt-6 pb-0">
        <div className="mb-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <Link href={`/workspaces/${workspaceId}`} className="hover:text-foreground">{project?.name?.split("")[0] ?? "..."}</Link>
          </div>
          <h1 className="text-xl font-bold text-foreground">{project?.name}</h1>
          {project?.description && <p className="text-sm text-muted-foreground">{project.description}</p>}
        </div>
        <div className="flex gap-1">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2 text-sm rounded-t-lg border-b-2 transition-colors",
                tab === t.id
                  ? "border-primary text-foreground font-medium"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
              data-testid={`tab-${t.id}`}
            >
              <t.icon className="w-3.5 h-3.5" />
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {tab === "tasks" && (
          <TasksTab projectId={projectId} workspaceId={workspaceId} />
        )}
        {tab === "team" && (
          <TeamTab projectId={projectId} workspaceId={workspaceId} teamLoad={teamLoad} />
        )}
        {tab === "allocate" && (
          <AllocateTab projectId={projectId} />
        )}
        {tab === "chat" && (
          <ChatTab projectId={projectId} />
        )}
        {tab === "analytics" && (
          <AnalyticsTab projectId={projectId} stats={stats} />
        )}
      </div>
    </div>
  );
}

function TasksTab({ projectId, workspaceId }: { projectId: string; workspaceId: string }) {
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("all");

  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [reqSkill, setReqSkill] = useState("");
  const [reqLevel, setReqLevel] = useState(1);
  const [estHours, setEstHours] = useState(4);
  const [priority, setPriority] = useState("MEDIUM");

  const { data: tasks } = useListTasks({ project_id: projectId });
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();

  const filteredTasks = tasks?.filter(t => statusFilter === "all" || t.status === statusFilter) ?? [];

  const handleCreate = async () => {
    if (!title.trim()) return;
    await createTask.mutateAsync({
      data: {
        project_id: projectId,
        title,
        description: desc || undefined,
        priority: priority as any,
        required_skill: reqSkill || "General",
        required_level: reqLevel,
        estimated_hours: estHours,
      }
    });
    await queryClient.invalidateQueries({ queryKey: getListTasksQueryKey({ project_id: projectId }) });
    setCreateOpen(false);
    setTitle(""); setDesc(""); setPriority("MEDIUM"); setReqSkill(""); setReqLevel(1); setEstHours(4);
    toast({ title: "Task created!" });
  };

  const handleUpdateStatus = async (task: Task, status: string) => {
    await updateTask.mutateAsync({ taskId: task.id, data: { status: status as any } });
    await queryClient.invalidateQueries({ queryKey: getListTasksQueryKey({ project_id: projectId }) });
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    await deleteTask.mutateAsync({ taskId: deleteId });
    await queryClient.invalidateQueries({ queryKey: getListTasksQueryKey({ project_id: projectId }) });
    setDeleteId(null);
    toast({ title: "Task deleted." });
  };

  const statusColor: Record<string, string> = {
    PENDING: "bg-accent text-muted-foreground",
    ASSIGNED: "bg-primary/20 text-primary",
    COMPLETED: "bg-green-500/20 text-green-400",
  };
  const priorityColor: Record<string, string> = { LOW: "text-muted-foreground", MEDIUM: "text-amber-400", HIGH: "text-red-400" };

  return (
    <div className="p-6 space-y-4 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex gap-2 flex-wrap">
          {["all", "PENDING", "ASSIGNED", "COMPLETED"].map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={cn("text-xs px-3 py-1 rounded-full transition-colors", statusFilter === s ? "bg-primary text-white" : "bg-accent text-muted-foreground hover:bg-accent/70")}
            >
              {s === "all" ? "All" : s}
            </button>
          ))}
        </div>
        <Button size="sm" onClick={() => setCreateOpen(true)} data-testid="button-new-task">
          <PlusCircle className="w-4 h-4 mr-1" />
          New Task
        </Button>
      </div>

      {filteredTasks.length === 0 ? (
        <EmptyState
          icon={CheckSquare}
          title="No tasks"
          description="Create tasks to track your project's work."
          actionLabel="New Task"
          onAction={() => setCreateOpen(true)}
        />
      ) : (
        <div className="space-y-2">
          {filteredTasks.map(task => (
            <div key={task.id} className="bg-card border border-border rounded-xl p-4 flex items-start gap-3" data-testid={`task-${task.id}`}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-medium text-sm text-foreground">{task.title}</p>
                  <span className={cn("text-xs font-semibold", priorityColor[task.priority] ?? "text-muted-foreground")}>
                    {task.priority}
                  </span>
                  <span className="text-xs bg-accent text-muted-foreground px-1.5 py-0.5 rounded">{task.estimated_hours}h</span>
                </div>
                {task.description && <p className="text-xs text-muted-foreground mb-2">{task.description}</p>}
                <div className="flex items-center gap-2">
                  <SkillTag name={task.required_skill} level={task.required_level} />
                  {task.assignee_name && (
                    <span className="text-xs text-muted-foreground">→ {task.assignee_name}</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <Select value={task.status} onValueChange={v => handleUpdateStatus(task, v)}>
                  <SelectTrigger className={cn("h-7 text-xs border-border w-36", statusColor[task.status] ?? "")}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border">
                    <SelectItem value="PENDING">Pending</SelectItem>
                    <SelectItem value="ASSIGNED">Assigned</SelectItem>
                    <SelectItem value="COMPLETED">Completed</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="ghost" size="sm" className="w-7 h-7 p-0 text-muted-foreground hover:text-destructive" onClick={() => setDeleteId(task.id)}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="bg-card border-border">
          <DialogHeader><DialogTitle>Create Task</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Task title" value={title} onChange={e => setTitle(e.target.value)} className="bg-accent border-border" data-testid="input-task-title" />
            <Textarea placeholder="Description" value={desc} onChange={e => setDesc(e.target.value)} className="bg-accent border-border" rows={2} />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Required Skill</label>
                <Input placeholder="e.g. React" value={reqSkill} onChange={e => setReqSkill(e.target.value)} className="bg-accent border-border h-8 text-sm" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Level (1-5)</label>
                <Input type="number" min={1} max={5} value={reqLevel} onChange={e => setReqLevel(Number(e.target.value))} className="bg-accent border-border h-8 text-sm" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Priority</label>
                <Select value={priority} onValueChange={setPriority}>
                  <SelectTrigger className="bg-accent border-border h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border">
                    <SelectItem value="LOW">Low</SelectItem>
                    <SelectItem value="MEDIUM">Medium</SelectItem>
                    <SelectItem value="HIGH">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Est. Hours</label>
                <Input type="number" min={1} max={200} value={estHours} onChange={e => setEstHours(Number(e.target.value))} className="bg-accent border-border h-8 text-sm" />
              </div>
            </div>
            <Button className="w-full" onClick={handleCreate} disabled={!title.trim() || createTask.isPending} data-testid="button-create-task">
              {createTask.isPending ? "Creating..." : "Create Task"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmModal
        open={!!deleteId}
        title="Delete task"
        description="This action cannot be undone."
        onConfirm={handleDelete}
        onClose={() => setDeleteId(null)}
        loading={deleteTask.isPending}
      />
    </div>
  );
}

function TeamTab({ projectId, workspaceId, teamLoad }: { projectId: string; workspaceId: string; teamLoad: any }) {
  const queryClient = useQueryClient();
  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [displayId, setDisplayId] = useState("");
  const [removeMemberId, setRemoveMemberId] = useState<string | null>(null);

  const { data: members } = useListProjectMembers(projectId);
  const addMember = useAddProjectMember();

  const handleAddMember = async () => {
    if (!displayId.trim()) return;
    try {
      await addMember.mutateAsync({ projectId, data: { display_id: displayId } });
      await queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "members"] });
      setAddMemberOpen(false);
      setDisplayId("");
      toast({ title: "Member added!" });
    } catch {
      toast({ title: "Member not found", description: "No user with that Display ID.", variant: "destructive" });
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Team Members ({members?.length ?? 0})</h2>
        <Button size="sm" onClick={() => setAddMemberOpen(true)} data-testid="button-add-member">
          <PlusCircle className="w-4 h-4 mr-1" />
          Add Member
        </Button>
      </div>

      {members && members.length > 0 ? (
        <div className="grid gap-4">
          {members.map((member: any) => {
            const load = teamLoad?.members?.find((m: any) => m.user_id === member.user_id);
            return (
              <div key={member.user_id} className="bg-card border border-border rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <Avatar className="w-10 h-10">
                    <AvatarImage src={member.avatar_url ?? ""} />
                    <AvatarFallback className="bg-accent">{member.name?.[0] ?? "U"}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium text-sm text-foreground">{member.name}</p>
                      <Badge variant="outline" className="text-xs border-border">{member.role}</Badge>
                    </div>
                    {member.skills && member.skills.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-2">
                        {member.skills.slice(0, 4).map((s: any) => (
                          <SkillTag key={s.name} name={s.name} level={s.level ?? 1} />
                        ))}
                      </div>
                    )}
                    {load && (
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>Workload</span>
                          <span>{load.load_percent ?? 0}%</span>
                        </div>
                        <LoadBar percent={load.load_percent ?? 0} />
                        <p className="text-xs text-muted-foreground">{load.assigned_hours ?? 0}h / {load.available_hours ?? 40}h this week</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <EmptyState
          icon={Users}
          title="No team members yet"
          description="Add teammates using their Display ID."
          actionLabel="Add Member"
          onAction={() => setAddMemberOpen(true)}
        />
      )}

      <Dialog open={addMemberOpen} onOpenChange={setAddMemberOpen}>
        <DialogContent className="bg-card border-border">
          <DialogHeader><DialogTitle>Add Team Member</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Enter the Display ID of the person you want to add.</p>
            <Input
              placeholder="e.g. ALICE01"
              value={displayId}
              onChange={e => setDisplayId(e.target.value.toUpperCase())}
              className="bg-accent border-border font-mono"
              data-testid="input-display-id"
            />
            <Button className="w-full" onClick={handleAddMember} disabled={!displayId.trim() || addMember.isPending} data-testid="button-submit-add-member">
              {addMember.isPending ? "Adding..." : "Add Member"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function AllocateTab({ projectId }: { projectId: string }) {
  const queryClient = useQueryClient();
  const { latestResult, setResult } = useAllocationStore();
  const [optimizeFor, setOptimizeFor] = useState("balanced");

  const { data: history } = useListAllocationHistory({ project_id: projectId });
  const runAllocation = useRunAllocation();

  const handleRun = async () => {
    try {
      const result = await runAllocation.mutateAsync({
        params: { project_id: projectId }
      });
      setResult(result);
      await queryClient.invalidateQueries({ queryKey: getListAllocationHistoryQueryKey({ project_id: projectId }) });
      toast({ title: "Allocation complete!", description: `${result.assigned} tasks assigned.` });
    } catch (e: any) {
      if (e?.response?.data?.detail?.error === "plan_required") {
        window.dispatchEvent(new CustomEvent("allocra:plan_required", { detail: { plan: "PRO" } }));
      } else {
        toast({ title: "Allocation failed", variant: "destructive" });
      }
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <div className="bg-card border border-border rounded-xl p-5">
        <h2 className="font-semibold mb-4">AI Allocation Engine</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Let Allocra's AI analyze your team's skills, availability, and current workload to optimally assign tasks.
        </p>
        <div className="flex items-center gap-3 mb-4">
          <label className="text-sm text-muted-foreground">Optimize for:</label>
          <Select value={optimizeFor} onValueChange={setOptimizeFor}>
            <SelectTrigger className="w-40 bg-accent border-border h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-popover border-border">
              <SelectItem value="balanced">Balanced</SelectItem>
              <SelectItem value="speed">Speed</SelectItem>
              <SelectItem value="quality">Quality</SelectItem>
              <SelectItem value="cost">Cost</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button onClick={handleRun} disabled={runAllocation.isPending} className="w-full sm:w-auto" data-testid="button-run-allocation">
          <Zap className="w-4 h-4 mr-1" />
          {runAllocation.isPending ? "Running allocation..." : "Run Allocation"}
        </Button>
      </div>

      {latestResult && (
        <div className="bg-card border border-primary/30 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Zap className="w-4 h-4 text-primary" />
            <h3 className="font-semibold">Latest Allocation Result</h3>
          </div>
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div>
              <p className="text-xs text-muted-foreground">Assigned</p>
              <p className="text-2xl font-bold text-foreground">{latestResult.assigned}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Unassigned</p>
              <p className="text-2xl font-bold text-foreground">{latestResult.unassigned}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Avg Score</p>
              <p className="text-2xl font-bold text-foreground">{Math.round(latestResult.avg_score)}</p>
            </div>
          </div>
          {latestResult.assignments && latestResult.assignments.length > 0 && (
            <div className="space-y-3">
              {latestResult.assignments.map((a, i) => (
                <div key={i} className="bg-accent rounded-lg p-3 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{a.task_title}</p>
                    <p className="text-xs text-muted-foreground">→ {a.assigned_to_name}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <RiskBadge level={a.risk_level} />
                    <div className="w-20">
                      <ScoreBar score={Math.round(a.score * 100)} showLabel />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          {latestResult.optimization_suggestions && latestResult.optimization_suggestions.length > 0 && (
            <div className="mt-3 space-y-1">
              {latestResult.optimization_suggestions.map((s, i) => (
                <p key={i} className="text-xs text-muted-foreground bg-accent rounded px-2 py-1">{s}</p>
              ))}
            </div>
          )}
        </div>
      )}

      {history && history.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="font-semibold mb-3">Allocation History</h3>
          <div className="space-y-2">
            {history.slice(0, 5).map((entry, i) => (
              <div key={entry.run_id ?? i} className="flex items-center gap-3 py-2 border-b border-border last:border-0">
                <div className="flex-1">
                  <p className="text-sm text-foreground">{entry.assigned} assigned / {entry.unassigned} unassigned</p>
                  <p className="text-xs text-muted-foreground">{entry.created_at ? new Date(entry.created_at).toLocaleString() : ""}</p>
                </div>
                <span className="text-sm font-medium text-foreground">Avg: {Math.round(entry.avg_score)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ChatTab({ projectId }: { projectId: string }) {
  const queryClient = useQueryClient();
  const [message, setMessage] = useState("");
  const { data: messages, isLoading } = useListChatMessages({ project_id: projectId });
  const sendMessage = useSendMessage();
  const addReaction = useAddReaction();

  const handleSend = async () => {
    if (!message.trim()) return;
    await sendMessage.mutateAsync({ data: { project_id: projectId, content: message } });
    await queryClient.invalidateQueries({ queryKey: getListChatMessagesQueryKey({ project_id: projectId }) });
    setMessage("");
  };

  const handleReaction = async (messageId: string, emoji: string) => {
    await addReaction.mutateAsync({ messageId, data: { emoji } });
    await queryClient.invalidateQueries({ queryKey: getListChatMessagesQueryKey({ project_id: projectId }) });
  };

  return (
    <div className="flex flex-col h-full max-h-[calc(100vh-200px)]">
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        )}
        {messages && messages.length === 0 && (
          <EmptyState
            icon={MessageSquare}
            title="No messages yet"
            description="Start the conversation!"
            className="py-12"
          />
        )}
        {messages?.map((msg: any) => (
          <div key={msg.id} className="flex gap-3" data-testid={`message-${msg.id}`}>
            <Avatar className="w-8 h-8 flex-shrink-0">
              <AvatarImage src={msg.user_avatar ?? ""} />
              <AvatarFallback className="bg-accent text-xs">{msg.user_name?.[0] ?? "U"}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-2 mb-1">
                <span className="text-sm font-medium text-foreground">{msg.user_name ?? "Unknown"}</span>
                <span className="text-xs text-muted-foreground">{msg.created_at ? new Date(msg.created_at).toLocaleTimeString() : ""}</span>
              </div>
              <div className="bg-card border border-border rounded-xl rounded-tl-none px-3 py-2">
                <p className="text-sm text-foreground">{msg.content}</p>
              </div>
              {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                <div className="flex gap-1 mt-1">
                  {Object.entries(msg.reactions as Record<string, number>).map(([emoji, count]) => (
                    <button
                      key={emoji}
                      onClick={() => msg.id && handleReaction(msg.id, emoji)}
                      className="text-xs bg-accent rounded-full px-2 py-0.5 hover:bg-accent/70 transition-colors"
                    >
                      {emoji} {count}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
      <div className="border-t border-border p-4">
        <div className="flex gap-2">
          <Input
            placeholder="Type a message..."
            value={message}
            onChange={e => setMessage(e.target.value)}
            onKeyDown={e => e.key === "Enter" && !e.shiftKey && handleSend()}
            className="bg-accent border-border flex-1"
            data-testid="input-chat-message"
          />
          <Button onClick={handleSend} disabled={!message.trim() || sendMessage.isPending} data-testid="button-send-message">
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function AnalyticsTab({ projectId, stats }: { projectId: string; stats: any }) {
  const { data: analytics } = useGetProjectAnalytics({ project_id: projectId });

  const taskStatusData = stats ? [
    { name: "Pending", value: stats.pending_tasks ?? 0 },
    { name: "Assigned", value: stats.assigned_tasks ?? 0 },
    { name: "Completed", value: stats.completed_tasks ?? 0 },
  ] : [];

  const scoreTrendData = analytics?.allocation_score_trend?.map(p => ({
    date: p.created_at ? new Date(p.created_at).toLocaleDateString() : "",
    score: Math.round(p.avg_score),
  })) ?? [];

  const riskTrendData = analytics?.risk_trend?.map(p => ({
    date: p.created_at ? new Date(p.created_at).toLocaleDateString() : "",
    risk: Math.round(p.avg_risk),
  })) ?? [];

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Tasks" value={stats?.total_tasks ?? 0} />
        <StatCard label="Completed" value={stats?.completed_tasks ?? 0} />
        <StatCard label="Avg Load" value={`${Math.round(stats?.avg_team_load ?? 0)}%`} />
        <StatCard label="Efficiency" value={`${Math.round((analytics?.allocation_efficiency ?? 0) * 100)}%`} />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="font-semibold mb-4">Task Status</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={taskStatusData}>
              <XAxis dataKey="name" tick={{ fill: "#94A3B8", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#94A3B8", fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: "#161828", border: "1px solid #2A2D45", borderRadius: 8, color: "#F1F5F9" }} />
              <Bar dataKey="value" fill="#5B6CFF" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {scoreTrendData.length > 0 && (
          <div className="bg-card border border-border rounded-xl p-5">
            <h3 className="font-semibold mb-4">Allocation Score Trend</h3>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={scoreTrendData}>
                <XAxis dataKey="date" tick={{ fill: "#94A3B8", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#94A3B8", fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: "#161828", border: "1px solid #2A2D45", borderRadius: 8, color: "#F1F5F9" }} />
                <Area type="monotone" dataKey="score" stroke="#5B6CFF" fill="#5B6CFF20" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        {analytics?.skill_coverage && analytics.skill_coverage.length > 0 && (
          <div className="bg-card border border-border rounded-xl p-5">
            <h3 className="font-semibold mb-4">Skill Coverage</h3>
            <div className="space-y-2">
              {analytics.skill_coverage.map((s, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span className="text-foreground">{s.skill}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">{s.member_count} members</span>
                    <div className="flex gap-0.5">
                      {Array.from({ length: 5 }).map((_, j) => (
                        <div key={j} className={cn("w-2 h-2 rounded-full", j < Math.round(s.avg_level) ? "bg-primary" : "bg-border")} />
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
