import { useState, useEffect } from "react";
import { api, User, Skill } from "@/lib/api";
import { showToast } from "@/components/Toast";
import Spinner from "@/components/Spinner";

const SKILL_SUGGESTIONS = [
  "Python", "JavaScript", "TypeScript", "React", "Node.js",
  "SQL", "Machine Learning", "Data Analysis", "DevOps", "Design",
  "Java", "Go", "Rust", "AWS", "Docker",
];

const SKILL_BADGE_COLORS = [
  "bg-blue-500/15 text-blue-400 border border-blue-500/25",
  "bg-purple-500/15 text-purple-400 border border-purple-500/25",
  "bg-cyan-500/15 text-cyan-400 border border-cyan-500/25",
  "bg-emerald-500/15 text-emerald-400 border border-emerald-500/25",
  "bg-amber-500/15 text-amber-400 border border-amber-500/25",
  "bg-rose-500/15 text-rose-400 border border-rose-500/25",
  "bg-indigo-500/15 text-indigo-400 border border-indigo-500/25",
];

function getSkillColor(skillName: string) {
  let hash = 0;
  for (let i = 0; i < skillName.length; i++) {
    hash = skillName.charCodeAt(i) + ((hash << 5) - hash);
  }
  return SKILL_BADGE_COLORS[Math.abs(hash) % SKILL_BADGE_COLORS.length];
}

export default function Team() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [name, setName] = useState("");
  const [hours, setHours] = useState<number>(40);
  const [skills, setSkills] = useState<Skill[]>([{ skill_name: "", level: 5 }]);

  const fetchUsers = async () => {
    try {
      const data = await api.getUsers();
      setUsers(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  const addSkillRow = () => setSkills([...skills, { skill_name: "", level: 5 }]);
  const removeSkillRow = (i: number) => setSkills(skills.filter((_, idx) => idx !== i));
  const updateSkill = (i: number, field: keyof Skill, value: string | number) => {
    setSkills(skills.map((s, idx) => idx === i ? { ...s, [field]: value } : s));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validSkills = skills.filter((s) => s.skill_name.trim());
    if (!name.trim()) return showToast("Name is required", "error");
    if (validSkills.length === 0) return showToast("Add at least one skill", "error");

    setSubmitting(true);
    try {
      await api.createUser({ name: name.trim(), available_hours: hours, skills: validSkills });
      showToast(`${name} added to team!`);
      setName("");
      setHours(40);
      setSkills([{ skill_name: "", level: 5 }]);
      await fetchUsers();
    } catch (err) {
      showToast((err as Error).message, "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteUser = async (userId: number, userName: string) => {
    try {
      await fetch(`https://allocra.onrender.com/api/v1/users/${userId}`, { method: "DELETE" });
      await fetchUsers();
      showToast(`${userName} removed`);
    } catch {
      showToast("Failed to delete user", "error");
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="mb-8 opacity-0 fade-in-up">
        <h1 className="text-3xl font-bold text-foreground mb-2">Team</h1>
        <p className="text-muted-foreground">Add team members and manage their skills and availability.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-2 opacity-0 fade-in-up stagger-1">
          <form onSubmit={handleSubmit} className="rounded-2xl border border-border bg-card p-6 space-y-5">
            <h2 className="text-lg font-semibold text-foreground">Add Team Member</h2>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Full Name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Jane Smith"
                className="w-full px-3 py-2.5 rounded-xl bg-accent/50 border border-input text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Available Hours / Week
                <span className="ml-2 text-primary font-bold">{hours}h</span>
              </label>
              <input
                type="range"
                min={1}
                max={80}
                value={hours}
                onChange={(e) => setHours(Number(e.target.value))}
                className="w-full accent-primary"
              />
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>1h</span>
                <span>80h</span>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-foreground">Skills</label>
                <button
                  type="button"
                  onClick={addSkillRow}
                  className="text-xs text-primary hover:text-primary/80 transition-colors font-medium"
                >
                  + Add Skill
                </button>
              </div>
              <div className="space-y-2">
                {skills.map((skill, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className="flex-1 relative">
                      <input
                        value={skill.skill_name}
                        onChange={(e) => updateSkill(i, "skill_name", e.target.value)}
                        placeholder="e.g. Python"
                        list={`skills-${i}`}
                        className="w-full px-3 py-2 rounded-xl bg-accent/50 border border-input text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all"
                      />
                      <datalist id={`skills-${i}`}>
                        {SKILL_SUGGESTIONS.map((s) => <option key={s} value={s} />)}
                      </datalist>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <span className="text-xs text-muted-foreground w-4 text-right">{skill.level}</span>
                      <input
                        type="range"
                        min={1}
                        max={10}
                        value={skill.level}
                        onChange={(e) => updateSkill(i, "level", Number(e.target.value))}
                        className="w-16 accent-primary"
                      />
                    </div>
                    {skills.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeSkillRow(i)}
                        className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-500/15 text-muted-foreground hover:text-red-400 transition-colors"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? <><Spinner size="sm" /><span>Adding...</span></> : "Add Team Member"}
            </button>
          </form>
        </div>

        <div className="lg:col-span-3 opacity-0 fade-in-up stagger-2">
          <div className="rounded-2xl border border-border bg-card overflow-hidden">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">Team Members</h2>
              {!loading && (
                <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-primary/10 text-primary">
                  {users.length} member{users.length !== 1 ? "s" : ""}
                </span>
              )}
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-16">
                <Spinner size="lg" />
              </div>
            ) : users.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-12 h-12 rounded-2xl bg-accent/50 flex items-center justify-center mb-3">
                  <svg className="w-6 h-6 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                  </svg>
                </div>
                <p className="text-sm text-muted-foreground">No team members yet</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {users.map((user, i) => (
                  <div
                    key={user.id}
                    className="px-6 py-4 hover:bg-accent/20 transition-colors opacity-0 fade-in-up"
                    style={{ animationDelay: `${0.05 * i}s` }}
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-sm font-bold text-primary flex-shrink-0">
                        {user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-foreground">{user.name}</span>
                          <span className="text-xs text-muted-foreground px-2 py-0.5 rounded-full bg-accent/60">
                            {user.available_hours}h/wk
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {user.skills.map((skill) => (
                            <span
                              key={skill.skill_name}
                              className={`text-xs px-2 py-0.5 rounded-full font-medium ${getSkillColor(skill.skill_name)}`}
                            >
                              {skill.skill_name} <span className="opacity-70">Lv.{skill.level}</span>
                            </span>
                          ))}
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteUser(user.id, user.name)}
                        className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-500/15 text-muted-foreground hover:text-red-400 transition-colors flex-shrink-0"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}