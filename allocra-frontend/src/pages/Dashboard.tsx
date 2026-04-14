import { useState, useEffect } from "react";
import { Link } from "wouter";
import { api, User, Task } from "@/lib/api";
import { getPriorityLabel, getPriorityColor } from "@/lib/utils";
import Spinner from "../components/Spinner.tsx";

interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
  delay?: string;
}

function StatCard({ label, value, icon, color, delay = "" }: StatCardProps) {
  return (
    <div
      className={`opacity-0 fade-in-up ${delay} rounded-2xl border border-border bg-card p-6 relative overflow-hidden group hover:border-primary/30 transition-all duration-300`}
    >
      <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${color} blur-2xl`} />
      <div className="relative z-10">
        <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center mb-4`}>
          {icon}
        </div>
        <div className="text-3xl font-bold text-foreground mb-1">{value}</div>
        <div className="text-sm text-muted-foreground font-medium">{label}</div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [users, setUsers] = useState<User[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [usersData, tasksData] = await Promise.all([
          api.getUsers(),
          api.getTasks(),
        ]);
        setUsers(usersData);
        setTasks(tasksData);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const highPriorityTasks = tasks.filter((t) => t.priority >= 3);
  const totalSkills = users.reduce((sum, u) => sum + u.skills.length, 0);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Hero */}
      <div className="mb-10 opacity-0 fade-in-up">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold mb-4 uppercase tracking-widest">
          <span className="w-1.5 h-1.5 rounded-full bg-primary glow-pulse" />
          System Status: Active
        </div>
        <h1 className="text-4xl sm:text-5xl font-bold text-foreground mb-3">
          Intelligent Task{" "}
          <span className="text-primary">Allocation</span>
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl">
          Automatically assign tasks to team members based on skills, availability, and workload using advanced scoring algorithms.
        </p>
      </div>

      {/* Stats */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Spinner size="lg" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
            <StatCard
              label="Team Members"
              value={users.length}
              delay="stagger-1"
              color="bg-primary/10"
              icon={
                <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              }
            />
            <StatCard
              label="Total Tasks"
              value={tasks.length}
              delay="stagger-2"
              color="bg-purple-500/10"
              icon={
                <svg className="w-5 h-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
              }
            />
            <StatCard
              label="Skill Entries"
              value={totalSkills}
              delay="stagger-3"
              color="bg-emerald-500/10"
              icon={
                <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              }
            />
          </div>

          {/* Recent data */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Team preview */}
            <div className="rounded-2xl border border-border bg-card p-6 opacity-0 fade-in-up stagger-4">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-semibold text-foreground">Team Members</h2>
                <Link href="/team">
                  <button className="text-xs text-primary hover:text-primary/80 transition-colors font-medium">
                    Manage Team →
                  </button>
                </Link>
              </div>
              {users.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  No team members yet. Add some on the Team page.
                </div>
              ) : (
                <div className="space-y-3">
                  {users.slice(0, 5).map((user) => (
                    <div key={user.id} className="flex items-center gap-3 p-3 rounded-xl bg-accent/30 hover:bg-accent/50 transition-colors">
                      <div className="w-9 h-9 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-xs font-bold text-primary flex-shrink-0">
                        {user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-foreground truncate">{user.name}</div>
                        <div className="text-xs text-muted-foreground">{user.available_hours}h available · {user.skills.length} skill{user.skills.length !== 1 ? "s" : ""}</div>
                      </div>
                    </div>
                  ))}
                  {users.length > 5 && (
                    <div className="text-xs text-muted-foreground text-center pt-1">+{users.length - 5} more</div>
                  )}
                </div>
              )}
            </div>

            {/* Task preview */}
            <div className="rounded-2xl border border-border bg-card p-6 opacity-0 fade-in-up stagger-5">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-semibold text-foreground">Active Tasks</h2>
                <Link href="/tasks">
                  <button className="text-xs text-primary hover:text-primary/80 transition-colors font-medium">
                    View All →
                  </button>
                </Link>
              </div>
              {tasks.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  No tasks yet. Create some on the Tasks page.
                </div>
              ) : (
                <div className="space-y-3">
                  {tasks.slice(0, 5).map((task) => (
                    <div key={task.id} className="flex items-center gap-3 p-3 rounded-xl bg-accent/30 hover:bg-accent/50 transition-colors">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-foreground truncate">{task.title}</div>
                        <div className="text-xs text-muted-foreground truncate">{task.required_skill} · Difficulty {task.difficulty}/10</div>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${getPriorityColor(task.priority)}`}>
                        {getPriorityLabel(task.priority)}
                      </span>
                    </div>
                  ))}
                  {tasks.length > 5 && (
                    <div className="text-xs text-muted-foreground text-center pt-1">+{tasks.length - 5} more</div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* CTA */}
          <div className="mt-6 rounded-2xl border border-primary/20 bg-primary/5 p-6 opacity-0 fade-in-up stagger-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-1">Ready to allocate?</h3>
                <p className="text-sm text-muted-foreground">
                  {highPriorityTasks.length > 0
                    ? `${highPriorityTasks.length} high-priority task${highPriorityTasks.length > 1 ? "s" : ""} waiting for assignment.`
                    : "Run the allocation algorithm to assign tasks to your team."}
                </p>
              </div>
              <Link href="/allocation">
                <button className="flex-shrink-0 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 active:scale-95 transition-all">
                  Run Allocation
                </button>
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
