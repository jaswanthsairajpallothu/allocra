import { useState, useEffect } from "react";
import { api, Task } from "@/lib/api";
import { showToast } from "@/components/Toast";
import Spinner from "@/components/Spinner";
import { getPriorityColor, getPriorityLabel, getDifficultyColor } from "@/lib/utils";

const SKILL_SUGGESTIONS = [
  "Python", "JavaScript", "TypeScript", "React", "Node.js",
  "SQL", "Machine Learning", "Data Analysis", "DevOps", "Design",
  "Java", "Go", "Rust", "AWS", "Docker",
];

function StarRating({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hovered, setHovered] = useState(0);
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          onMouseEnter={() => setHovered(star)}
          onMouseLeave={() => setHovered(0)}
          className="transition-transform hover:scale-110 active:scale-95"
        >
          <svg
            className={`w-7 h-7 transition-colors ${
              star <= (hovered || value)
                ? star >= 4 ? "text-red-400" : star >= 3 ? "text-orange-400" : star >= 2 ? "text-yellow-400" : "text-emerald-400"
                : "text-muted-foreground/30"
            }`}
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
        </button>
      ))}
    </div>
  );
}

export default function Tasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [title, setTitle] = useState("");
  const [requiredSkill, setRequiredSkill] = useState("");
  const [difficulty, setDifficulty] = useState(5);
  const [priority, setPriority] = useState(2);

  const fetchTasks = async () => {
    try {
      const data = await api.getTasks();
      setTasks(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTasks(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return showToast("Title is required", "error");
    if (!requiredSkill.trim()) return showToast("Required skill is needed", "error");

    setSubmitting(true);
    try {
      await api.createTask({ title: title.trim(), required_skill: requiredSkill.trim(), difficulty, priority });
      showToast(`Task "${title}" created!`);
      setTitle("");
      setRequiredSkill("");
      setDifficulty(5);
      setPriority(2);
      await fetchTasks();
    } catch (err) {
      showToast((err as Error).message, "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteTask = async (taskId: number, taskTitle: string) => {
    try {
      await fetch(`https://allocra.onrender.com/api/v1/tasks/${taskId}`, { method: "DELETE" });
      await fetchTasks();
      showToast(`"${taskTitle}" deleted`);
    } catch {
      showToast("Failed to delete task", "error");
    }
  };

  const difficultyLabel = difficulty >= 8 ? "Expert" : difficulty >= 5 ? "Intermediate" : "Beginner";

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="mb-8 opacity-0 fade-in-up">
        <h1 className="text-3xl font-bold text-foreground mb-2">Tasks</h1>
        <p className="text-muted-foreground">Define tasks with their required skills and assign priorities.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-2 opacity-0 fade-in-up stagger-1">
          <form onSubmit={handleSubmit} className="rounded-2xl border border-border bg-card p-6 space-y-5">
            <h2 className="text-lg font-semibold text-foreground">Create Task</h2>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Task Title</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Build authentication system"
                className="w-full px-3 py-2.5 rounded-xl bg-accent/50 border border-input text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Required Skill</label>
              <input
                value={requiredSkill}
                onChange={(e) => setRequiredSkill(e.target.value)}
                placeholder="e.g. Python"
                list="task-skills"
                className="w-full px-3 py-2.5 rounded-xl bg-accent/50 border border-input text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all"
              />
              <datalist id="task-skills">
                {SKILL_SUGGESTIONS.map((s) => <option key={s} value={s} />)}
              </datalist>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Difficulty
                <span className={`ml-2 text-xs px-2 py-0.5 rounded-full font-semibold ${getDifficultyColor(difficulty)}`}>
                  {difficulty}/10 — {difficultyLabel}
                </span>
              </label>
              <input
                type="range"
                min={1}
                max={10}
                value={difficulty}
                onChange={(e) => setDifficulty(Number(e.target.value))}
                className="w-full accent-primary"
              />
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>Easy</span>
                <span>Expert</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Priority
                <span className={`ml-2 text-xs px-2 py-0.5 rounded-full font-semibold ${getPriorityColor(priority)}`}>
                  {getPriorityLabel(priority)}
                </span>
              </label>
              <StarRating value={priority} onChange={setPriority} />
              <p className="text-xs text-muted-foreground mt-1">1 star = Low, 5 stars = Critical</p>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? <><Spinner size="sm" /><span>Creating...</span></> : "Create Task"}
            </button>
          </form>
        </div>

        <div className="lg:col-span-3 opacity-0 fade-in-up stagger-2">
          <div className="rounded-2xl border border-border bg-card overflow-hidden">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">All Tasks</h2>
              {!loading && (
                <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-primary/10 text-primary">
                  {tasks.length} task{tasks.length !== 1 ? "s" : ""}
                </span>
              )}
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-16">
                <Spinner size="lg" />
              </div>
            ) : tasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-12 h-12 rounded-2xl bg-accent/50 flex items-center justify-center mb-3">
                  <svg className="w-6 h-6 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <p className="text-sm text-muted-foreground">No tasks yet</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Task</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Skill</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Difficulty</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Priority</th>
                      <th className="px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {tasks.map((task, i) => (
                      <tr
                        key={task.id}
                        className="hover:bg-accent/20 transition-colors opacity-0 fade-in-up"
                        style={{ animationDelay: `${0.05 * i}s` }}
                      >
                        <td className="px-6 py-4">
                          <span className="text-sm font-medium text-foreground">{task.title}</span>
                        </td>
                        <td className="px-4 py-4">
                          <span className="text-xs px-2.5 py-1 rounded-full bg-cyan-500/15 text-cyan-400 border border-cyan-500/25 font-medium">
                            {task.required_skill}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-1.5 rounded-full bg-accent overflow-hidden">
                              <div
                                className={`h-full rounded-full ${task.difficulty >= 8 ? "bg-red-500" : task.difficulty >= 5 ? "bg-yellow-500" : "bg-emerald-500"}`}
                                style={{ width: `${(task.difficulty / 10) * 100}%` }}
                              />
                            </div>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${getDifficultyColor(task.difficulty)}`}>{task.difficulty}</span>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${getPriorityColor(task.priority)}`}>
                            {getPriorityLabel(task.priority)}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <button
                            onClick={() => handleDeleteTask(task.id, task.title)}
                            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-500/15 text-muted-foreground hover:text-red-400 transition-colors"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}