import { useState, useEffect, useRef } from "react";
import { api, AllocationResult, Task, User } from "@/lib/api";
import { showToast } from "@/components/Toast";
import { getInitials, getAvatarColor } from "@/lib/utils";
import Spinner from "@/components/Spinner";

function ScoreBadge({ score }: { score: number }) {
  const safeScore = score ?? 0;
  const pct = Math.min(100, Math.round(safeScore * 10));
  const color = pct >= 70 ? "bg-emerald-500" : pct >= 40 ? "bg-yellow-500" : "bg-red-500";
  const textColor = pct >= 70 ? "text-emerald-400" : pct >= 40 ? "text-yellow-400" : "text-red-400";
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.width = "0%";
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        el.style.transition = "width 1s cubic-bezier(0.4, 0, 0.2, 1)";
        el.style.width = `${pct}%`;
      });
    });
  }, [pct]);

  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-2 rounded-full bg-accent overflow-hidden">
        <div ref={ref} className={`h-full rounded-full ${color}`} style={{ width: 0 }} />
      </div>
      <span className={`text-sm font-bold min-w-[3rem] text-right ${textColor}`}>
        {safeScore.toFixed(1)}
      </span>
    </div>
  );
}

function Avatar({ name }: { name: string }) {
  return (
    <div className={`w-8 h-8 rounded-full ${getAvatarColor(name)} flex items-center justify-center text-xs font-bold text-white flex-shrink-0`}>
      {getInitials(name)}
    </div>
  );
}

export default function Allocation() {
  const [result, setResult] = useState<AllocationResult | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const [t, u] = await Promise.all([api.getTasks(), api.getUsers()]);
        setTasks(t);
        setUsers(u);
      } finally {
        setLoadingData(false);
      }
    };
    fetch();
  }, []);

  const runAllocation = async () => {
    setLoading(true);
    setResult(null);
    try {
      const data = await api.runAllocation();
      setResult(data);
      const assignedCount = Object.keys(data.assigned).length;
      const unassignedCount = data.unassigned.length;
      showToast(`Allocated ${assignedCount} task${assignedCount !== 1 ? "s" : ""}. ${unassignedCount > 0 ? `${unassignedCount} unassigned.` : "All tasks assigned!"}`);
    } catch (err) {
      showToast((err as Error).message, "error");
    } finally {
      setLoading(false);
    }
  };

  const getTaskTitle = (taskId: string | number) =>
    tasks.find((t) => t.id === Number(taskId))?.title ?? `Task #${taskId}`;

  const getUserName = (userId: string | number) =>
    users.find((u) => u.id === Number(userId))?.name ?? `User #${userId}`;

  const assignedEntries = result
    ? Object.entries(result.reasoning)
    : [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="mb-8 opacity-0 fade-in-up">
        <h1 className="text-3xl font-bold text-foreground mb-2">Allocation</h1>
        <p className="text-muted-foreground">Run the intelligent algorithm to optimally assign tasks to team members.</p>
      </div>

      {/* Run Button Card */}
      <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10 p-8 mb-8 opacity-0 fade-in-up stagger-1 text-center">
        <div className="w-16 h-16 rounded-2xl bg-primary/15 border border-primary/25 flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 3l14 9-14 9V3z" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-foreground mb-2">Run Allocation Algorithm</h2>
        <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
          The system will analyze {tasks.length} task{tasks.length !== 1 ? "s" : ""} and {users.length} team member{users.length !== 1 ? "s" : ""}, then score and assign each task based on skill match and availability.
        </p>
        <button
          onClick={runAllocation}
          disabled={loading || loadingData}
          className="inline-flex items-center gap-3 px-8 py-3.5 rounded-xl bg-primary text-primary-foreground font-bold text-base hover:opacity-90 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary/25"
        >
          {loading ? (
            <><Spinner size="md" /><span>Running Allocation...</span></>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Run Allocation
            </>
          )}
        </button>
      </div>

      {/* Results */}
      {result && (
        <div className="space-y-6">
          {/* Summary badges */}
          <div className="grid grid-cols-3 gap-4 opacity-0 fade-in-up">
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-center">
              <div className="text-2xl font-bold text-emerald-400 mb-1">{Object.keys(result.assigned).length}</div>
              <div className="text-xs text-muted-foreground font-medium">Assigned</div>
            </div>
            <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-center">
              <div className="text-2xl font-bold text-red-400 mb-1">{result.unassigned.length}</div>
              <div className="text-xs text-muted-foreground font-medium">Unassigned</div>
            </div>
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-center">
              <div className="text-2xl font-bold text-primary mb-1">
                {assignedEntries.length > 0
                  ? (assignedEntries.reduce((sum, [, r]) => sum + r.score, 0) / assignedEntries.length).toFixed(1)
                  : "—"}
              </div>
              <div className="text-xs text-muted-foreground font-medium">Avg Score</div>
            </div>
          </div>

          {/* Assigned results */}
          {assignedEntries.length > 0 && (
            <div className="rounded-2xl border border-border bg-card overflow-hidden opacity-0 fade-in-up stagger-1">
              <div className="px-6 py-4 border-b border-border flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-emerald-400" />
                <h2 className="text-lg font-semibold text-foreground">Assigned Tasks</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Task</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Assigned To</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider w-40">Score</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Skill Lv.</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Load After</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {assignedEntries.map(([taskId, reasoning], i) => (
                      <tr
                        key={taskId}
                        className="hover:bg-accent/20 transition-colors opacity-0 fade-in-up"
                        style={{ animationDelay: `${0.05 * i}s` }}
                      >
                        <td className="px-6 py-4">
                          <span className="text-sm font-medium text-foreground">{getTaskTitle(taskId)}</span>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2.5">
                            <Avatar name={reasoning.assigned_to ?? ""} />
                            <span className="text-sm text-foreground font-medium">{reasoning.assigned_to ?? "Unknown"}</span>
                          </div>
                        </td>
                        <td className="px-4 py-4 min-w-[160px]">
                          <ScoreBadge score={reasoning.score} />
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-1">
                            {[1,2,3,4,5,6,7,8,9,10].slice(0, reasoning.skill_level).map((_, j) => (
                              <div key={j} className="w-1.5 h-1.5 rounded-full bg-primary" />
                            ))}
                            {[1,2,3,4,5,6,7,8,9,10].slice(reasoning.skill_level).map((_, j) => (
                              <div key={j} className="w-1.5 h-1.5 rounded-full bg-muted" />
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <span className={`text-sm font-medium ${
                            reasoning.load_after_assignment > 40 ? "text-red-400" :
                            reasoning.load_after_assignment > 20 ? "text-yellow-400" :
                            "text-emerald-400"
                          }`}>
                            {reasoning.load_after_assignment}h
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Unassigned */}
          {result.unassigned.length > 0 && (
            <div className="rounded-2xl border border-red-500/30 bg-red-500/5 overflow-hidden opacity-0 fade-in-up stagger-2">
              <div className="px-6 py-4 border-b border-red-500/20 flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-red-400" />
                <h2 className="text-lg font-semibold text-foreground">Unassigned Tasks</h2>
                <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/30 font-semibold ml-auto">
                  {result.unassigned.length} unmatched
                </span>
              </div>
              <div className="p-6">
                <p className="text-xs text-muted-foreground mb-4">
                  These tasks could not be assigned — no team member has the required skill or sufficient availability.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {result.unassigned.map((taskId) => (
                    <div key={taskId} className="flex items-center gap-3 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                      <div className="w-8 h-8 rounded-lg bg-red-500/20 flex items-center justify-center flex-shrink-0">
                        <svg className="w-4 h-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div>
                        <div className="text-sm font-medium text-foreground">{getTaskTitle(taskId)}</div>
                        <div className="text-xs text-red-400">No suitable assignee found</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
