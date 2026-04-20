import { useEffect, useState, useLayoutEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Zap, Users, TrendingUp, AlertTriangle, ArrowRight, Plus, ChevronRight, Building2, FolderOpen } from 'lucide-react'
import { useWorkspaceStore } from '@/store/workspaceStore'
import { useAuthStore } from '@/store/authStore'
import { membershipService } from '@/services/membershipService'
import { taskService } from '@/services/taskService'
import { workspaceService } from '@/services/workspaceService'
import { projectService } from '@/services/projectService'
import { MemberLoad, Task } from '@/types'
import { useLayout } from '@/components/layout/AppLayout'
import ContextGuard from '@/components/layout/ContextGuard'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import Avatar from '@/components/ui/Avatar'
import { cn } from '@/lib/utils'

function LoadBar({ pct, status }: { pct: number; status: string }) {
  const color = status === 'SAFE' ? 'bg-emerald' : status === 'WARNING' ? 'bg-amber' : 'bg-rose'
  return (
    <div className="flex items-center gap-2.5">
      <div className="flex-1 h-1.5 bg-stone rounded-full overflow-hidden">
        <div className={cn('h-full rounded-full transition-all duration-500', color)} style={{ width: `${Math.min(pct, 100)}%` }} />
      </div>
      <span className="text-xs font-mono text-ink-3 w-8 text-right">{pct.toFixed(0)}%</span>
    </div>
  )
}

export default function Dashboard() {
  const navigate = useNavigate()
  const { setAction } = useLayout()
  const { user } = useAuthStore()
  const { workspaces, selectedWorkspace, selectedProject, setWorkspaces, setProjects, selectWorkspace, selectProject } = useWorkspaceStore()
  const [members, setMembers] = useState<MemberLoad[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(false)

  useLayoutEffect(() => {
    setAction(
      <Button size="sm" icon={<Zap size={13} />} onClick={() => navigate('/allocation')}>
        Run Allocation
      </Button>
    )
    return () => setAction(null)
  }, [])

  useEffect(() => {
    if (workspaces.length === 0) {
      workspaceService.list().then(async wss => {
        setWorkspaces(wss)
        if (wss.length > 0) {
          selectWorkspace(wss[0])
          const projs = await projectService.list(wss[0].id)
          setProjects(projs)
          if (projs.length > 0) selectProject(projs[0])
        }
      }).catch(() => {})
    }
  }, [])

  useEffect(() => {
    if (!selectedProject) return
    setLoading(true)
    Promise.all([
      membershipService.getTeamLoad(selectedProject.id),
      taskService.list(selectedProject.id),
    ]).then(([m, t]) => { setMembers(m); setTasks(t) })
      .catch(() => {}).finally(() => setLoading(false))
  }, [selectedProject?.id])

  if (!selectedWorkspace) return (
    <div className="page">
      <div className="mb-8">
        <h2 className="text-lg font-bold text-ink">Welcome, {user?.name?.split(' ')[0]} 👋</h2>
        <p className="text-ink-3 text-sm mt-1">Start by setting up your team space</p>
      </div>
      <div className="card p-10 text-center" style={{borderStyle:'dashed',borderWidth:2}}>
        <div className="w-12 h-12 rounded-xl bg-violet-muted flex items-center justify-center mx-auto mb-4">
          <Building2 size={22} className="text-violet" />
        </div>
        <h3 className="text-sm font-semibold text-ink mb-1">Create your first workspace</h3>
        <p className="text-sm text-ink-3 max-w-xs mx-auto mb-5">A workspace organises your team and projects in one place.</p>
        <Button icon={<Plus size={14} />} onClick={() => navigate('/workspace')}>Create workspace</Button>
      </div>
    </div>
  )

  const avgLoad = members.length > 0 ? Math.round(members.reduce((s, m) => s + m.load_pct, 0) / members.length) : 0
  const overloaded = members.filter(m => m.status === 'OVERLOAD').length
  const pending = tasks.filter(t => t.status === 'PENDING').length
  const highPriority = tasks.filter(t => t.priority === 'HIGH' && t.status === 'PENDING').length

  return (
    <div className="page">
      <div className="mb-6">
        <h2 className="text-lg font-bold text-ink">{selectedProject ? selectedProject.name : selectedWorkspace.name}</h2>
        <p className="text-sm text-ink-3 mt-0.5">
          {selectedProject ? `${selectedWorkspace.name} · Project overview` : 'Select a project from the sidebar'}
        </p>
      </div>

      {!selectedProject ? (
        <div className="card p-10 text-center" style={{borderStyle:'dashed',borderWidth:2}}>
          <div className="w-12 h-12 rounded-xl bg-violet-muted flex items-center justify-center mx-auto mb-4">
            <FolderOpen size={22} className="text-violet" />
          </div>
          <h3 className="text-sm font-semibold text-ink mb-1">No project selected</h3>
          <p className="text-sm text-ink-3 max-w-xs mx-auto mb-5">Use the sidebar to select or create a project.</p>
          <Button size="sm" icon={<Plus size={13} />} onClick={() => navigate('/workspace')}>Create project</Button>
        </div>
      ) : (
        <>
          {/* Stat strip */}
          <div className="grid grid-cols-4 gap-4 mb-5">
            {[
              { label: 'Avg Team Load', value: `${avgLoad}%`, sub: overloaded > 0 ? `${overloaded} overloaded` : 'Team balanced', color: overloaded > 0 ? 'text-rose' : 'text-emerald', bg: overloaded > 0 ? 'bg-rose-bg' : 'bg-emerald-bg', icon: TrendingUp },
              { label: 'Members', value: String(members.length), sub: 'in this project', color: 'text-violet', bg: 'bg-violet-muted', icon: Users },
              { label: 'Pending Tasks', value: String(pending), sub: `${highPriority} high priority`, color: 'text-amber', bg: 'bg-amber-bg', icon: Zap },
              { label: 'Risk Level', value: overloaded > 0 ? 'HIGH' : 'LOW', sub: overloaded > 0 ? 'Action needed' : 'All clear', color: overloaded > 0 ? 'text-rose' : 'text-emerald', bg: overloaded > 0 ? 'bg-rose-bg' : 'bg-emerald-bg', icon: AlertTriangle },
            ].map(({ label, value, sub, color, bg, icon: Icon }) => (
              <div key={label} className="stat">
                <div className="flex items-start justify-between mb-3">
                  <p className="text-xs font-semibold text-ink-3">{label}</p>
                  <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0', bg)}>
                    <Icon size={13} className={color} />
                  </div>
                </div>
                <p className={cn('text-2xl font-bold font-mono', color)}>{value}</p>
                <p className="text-[11px] text-ink-3 mt-1">{sub}</p>
              </div>
            ))}
          </div>

          {/* Content grid */}
          <div className="grid grid-cols-5 gap-4">
            <div className="col-span-3 card p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-ink">Team Load</h3>
                <button onClick={() => navigate('/team')} className="text-xs text-violet hover:underline flex items-center gap-1">View all <ArrowRight size={11} /></button>
              </div>
              {loading ? (
                <div className="space-y-4">{[...Array(3)].map((_, i) => <div key={i} className="flex items-center gap-3"><div className="skeleton w-8 h-8 rounded-full" /><div className="flex-1 space-y-2"><div className="skeleton h-2.5 w-24 rounded" /><div className="skeleton h-1.5 rounded-full" /></div></div>)}</div>
              ) : members.length === 0 ? (
                <div className="py-8 text-center"><p className="text-sm text-ink-3 mb-3">No members yet.</p><Button size="sm" variant="secondary" onClick={() => navigate('/team')}>Set up team →</Button></div>
              ) : (
                <div className="space-y-4">
                  {members.slice(0, 6).map(m => (
                    <div key={m.user_id} className="flex items-center gap-3">
                      <Avatar name={m.user_name} photo={localStorage.getItem(`avatar_${m.user_name}`)} size="sm" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[13px] font-medium text-ink truncate">{m.user_name}</span>
                          <Badge variant={m.status === 'SAFE' ? 'safe' : m.status === 'WARNING' ? 'warn' : 'danger'} dot>{m.status}</Badge>
                        </div>
                        <LoadBar pct={m.load_pct} status={m.status} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="col-span-2 space-y-4">
              <div className="card p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-ink">Pending Tasks</h3>
                  <button onClick={() => navigate('/tasks')} className="text-xs text-violet hover:underline flex items-center gap-1">All <ArrowRight size={11} /></button>
                </div>
                {tasks.filter(t => t.status === 'PENDING').length === 0 ? (
                  <p className="text-sm text-ink-3 py-4 text-center">All tasks assigned ✓</p>
                ) : (
                  <div className="space-y-2">
                    {tasks.filter(t => t.status === 'PENDING').slice(0, 5).map(t => (
                      <div key={t.id} className="flex items-center gap-2.5 py-1">
                        <div className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', t.priority === 'HIGH' ? 'bg-rose' : t.priority === 'MEDIUM' ? 'bg-amber' : 'bg-emerald')} />
                        <span className="text-[13px] text-ink truncate flex-1">{t.title}</span>
                        <span className="text-[11px] font-mono text-ink-3">{t.estimated_hours}h</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="card p-5">
                <h3 className="text-sm font-semibold text-ink mb-3">Quick Actions</h3>
                <div className="space-y-0.5">
                  {[
                    { label: 'Run allocation', to: '/allocation', icon: Zap },
                    { label: 'View team capacity', to: '/team', icon: Users },
                    { label: 'Add tasks', to: '/tasks', icon: TrendingUp },
                  ].map(({ label, to, icon: Icon }) => (
                    <button key={to} onClick={() => navigate(to)} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-stone transition-colors text-left group">
                      <Icon size={13} className="text-ink-3 group-hover:text-violet transition-colors" />
                      <span className="text-[13px] text-ink-2 group-hover:text-ink transition-colors">{label}</span>
                      <ChevronRight size={12} className="text-ink-3 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
