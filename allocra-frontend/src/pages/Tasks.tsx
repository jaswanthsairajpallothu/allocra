import { useEffect, useState, useLayoutEffect } from 'react'
import { Plus, Trash2, Pencil, Clock, CheckSquare } from 'lucide-react'
import { useWorkspaceStore } from '@/store/workspaceStore'
import { taskService } from '@/services/taskService'
import { Task } from '@/types'
import { useLayout } from '@/components/layout/AppLayout'
import ContextGuard from '@/components/layout/ContextGuard'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import Modal from '@/components/ui/Modal'
import { showToast } from '@/components/ui/Toast'
import { getErrorMessage, KNOWN_SKILLS, cn } from '@/lib/utils'

const PRIORITY_COLORS = { HIGH: 'bg-rose', MEDIUM: 'bg-amber', LOW: 'bg-emerald' }
const PRIORITY_BADGE: Record<string, 'high'|'medium'|'low'> = { HIGH: 'high', MEDIUM: 'medium', LOW: 'low' }
const STATUS_BADGE: Record<string, 'default'|'violet'|'safe'> = { PENDING: 'default', ASSIGNED: 'violet', COMPLETED: 'safe' }

function TaskForm({ initial, projectId, onSubmit, loading }: {
  initial?: Partial<Task>; projectId: string
  onSubmit: (d: any) => void; loading: boolean
}) {
  const [title, setTitle] = useState(initial?.title || '')
  const [skill, setSkill] = useState(initial?.required_skill || '')
  const [level, setLevel] = useState(initial?.required_level || 3)
  const [hours, setHours] = useState(initial?.estimated_hours || 8)
  const [priority, setPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH'>(initial?.priority || 'MEDIUM')
  const [desc, setDesc] = useState(initial?.description || '')

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-[12px] font-bold uppercase tracking-wide text-ink-2 mb-1.5">Task title *</label>
        <input className="field" placeholder="e.g. Build authentication flow" value={title} onChange={e => setTitle(e.target.value)} autoFocus />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-[12px] font-bold uppercase tracking-wide text-ink-2 mb-1.5">Required skill *</label>
          <input className="field" placeholder="e.g. React" list="skills-dl" value={skill} onChange={e => setSkill(e.target.value)} />
          <datalist id="skills-dl">{KNOWN_SKILLS.map(s => <option key={s} value={s} />)}</datalist>
        </div>
        <div>
          <label className="block text-[12px] font-bold uppercase tracking-wide text-ink-2 mb-1.5">Skill level (1–5)</label>
          <input type="number" min={1} max={5} className="field" value={level} onChange={e => setLevel(Number(e.target.value))} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-[12px] font-bold uppercase tracking-wide text-ink-2 mb-1.5">Estimated hours</label>
          <input type="number" min={1} className="field" value={hours} onChange={e => setHours(Number(e.target.value))} />
        </div>
        <div>
          <label className="block text-[12px] font-bold uppercase tracking-wide text-ink-2 mb-1.5">Priority</label>
          <select className="field" value={priority} onChange={e => setPriority(e.target.value as 'LOW' | 'MEDIUM' | 'HIGH')}>
            {['HIGH','MEDIUM','LOW'].map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label className="block text-[12px] font-bold uppercase tracking-wide text-ink-2 mb-1.5">Description (optional)</label>
        <textarea className="field resize-none h-16" placeholder="Additional context…" value={desc} onChange={e => setDesc(e.target.value)} />
      </div>
      <Button className="w-full" size="md" loading={loading}
        onClick={() => onSubmit({ title, required_skill: skill, required_level: level, estimated_hours: hours, priority, description: desc, project_id: projectId })}>
        {initial ? 'Save changes' : 'Create task'}
      </Button>
    </div>
  )
}

export default function Tasks() {
  const { selectedProject } = useWorkspaceStore()
  const { setAction } = useLayout()
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [editTask, setEditTask] = useState<Task | null>(null)
  const [filter, setFilter] = useState('ALL')

  useLayoutEffect(() => {
    setAction(
      <Button size="sm" icon={<Plus size={13} />} onClick={() => setCreateOpen(true)}>
        Add Task
      </Button>
    )
    return () => setAction(null)
  }, [])

  useEffect(() => {
    if (!selectedProject) return
    setLoading(true)
    taskService.list(selectedProject.id).then(setTasks).catch(() => {}).finally(() => setLoading(false))
  }, [selectedProject?.id])

  const handleCreate = async (data: any) => {
    setSubmitting(true)
    try {
      const t = await taskService.create(data)
      setTasks(prev => [t, ...prev]); setCreateOpen(false); showToast('Task created')
    } catch (err) { showToast(getErrorMessage(err), 'error') }
    finally { setSubmitting(false) }
  }

  const handleEdit = async (data: any) => {
    if (!editTask) return
    setSubmitting(true)
    try {
      const t = await taskService.update(editTask.id, data)
      setTasks(prev => prev.map(x => x.id === t.id ? t : x)); setEditTask(null); showToast('Task updated')
    } catch (err) { showToast(getErrorMessage(err), 'error') }
    finally { setSubmitting(false) }
  }

  const handleDelete = async (task: Task) => {
    if (!confirm(`Delete "${task.title}"?`)) return
    try {
      await taskService.delete(task.id)
      setTasks(prev => prev.filter(t => t.id !== task.id)); showToast('Task deleted')
    } catch (err) { showToast(getErrorMessage(err), 'error') }
  }

  const filtered = filter === 'ALL' ? tasks : tasks.filter(t => t.status === filter)

  return (
    <ContextGuard requireProject>
      <div className="page">
        <div className="flex items-start justify-between mb-5">
          <div>
            <h2 className="text-lg font-bold text-ink">Tasks</h2>
            <p className="text-sm text-ink-3 mt-0.5">{tasks.length} task{tasks.length !== 1 ? 's' : ''}</p>
          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-1 mb-4 bg-white border border-border rounded-lg p-1 w-fit">
          {['ALL','PENDING','ASSIGNED','COMPLETED'].map(s => (
            <button key={s} onClick={() => setFilter(s)}
              className={cn('px-3 py-1.5 rounded-md text-xs font-semibold transition-all',
                filter === s ? 'bg-violet text-white shadow-xs' : 'text-ink-2 hover:bg-stone'
              )}>
              {s}
              {s !== 'ALL' && (
                <span className="ml-1.5 font-mono">{tasks.filter(t => t.status === s).length}</span>
              )}
            </button>
          ))}
        </div>

        <div className="card overflow-hidden">
          {loading ? (
            <div className="p-6 space-y-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="flex gap-4">
                  <div className="skeleton h-3 rounded flex-1" />
                  <div className="skeleton h-3 rounded w-20" />
                  <div className="skeleton h-3 rounded w-16" />
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-16 text-center">
              <CheckSquare size={32} className="text-ink-3 mx-auto mb-3" />
              <p className="text-sm font-semibold text-ink mb-1">No tasks yet</p>
              <p className="text-sm text-ink-3 mb-4">Add tasks to start making smarter assignment decisions.</p>
              <Button size="sm" icon={<Plus size={13} />} onClick={() => setCreateOpen(true)}>Add Task</Button>
            </div>
          ) : (
            <table className="tbl">
              <thead>
                <tr>
                  <th>Task</th><th>Skill</th><th>Level</th><th>Hours</th><th>Priority</th><th>Status</th><th className="w-16"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(task => (
                  <tr key={task.id}>
                    <td>
                      <div className="flex items-center gap-2">
                        <div className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', PRIORITY_COLORS[task.priority])} />
                        <div>
                          <p className="font-medium text-ink">{task.title}</p>
                          {task.description && <p className="text-xs text-ink-3 truncate max-w-xs">{task.description}</p>}
                        </div>
                      </div>
                    </td>
                    <td><span className="font-mono text-[12px] bg-stone border border-border px-1.5 py-0.5 rounded">{task.required_skill}</span></td>
                    <td><span className="font-mono text-sm text-ink-2">{task.required_level}/5</span></td>
                    <td><span className="flex items-center gap-1 text-ink-2 text-sm"><Clock size={11} className="text-ink-3" />{task.estimated_hours}h</span></td>
                    <td><Badge variant={PRIORITY_BADGE[task.priority]}>{task.priority}</Badge></td>
                    <td><Badge variant={STATUS_BADGE[task.status]}>{task.status}</Badge></td>
                    <td>
                      <div className="flex gap-0.5">
                        <button onClick={() => setEditTask(task)} className="p-1.5 rounded hover:bg-stone text-ink-3 hover:text-ink transition-colors"><Pencil size={13} /></button>
                        <button onClick={() => handleDelete(task)} className="p-1.5 rounded hover:bg-rose-bg text-ink-3 hover:text-rose transition-colors"><Trash2 size={13} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {selectedProject && (
        <>
          <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Add Task" subtitle="Define work for this sprint" width="lg">
            <TaskForm projectId={selectedProject.id} onSubmit={handleCreate} loading={submitting} />
          </Modal>
          <Modal open={!!editTask} onClose={() => setEditTask(null)} title="Edit Task" width="lg">
            {editTask && <TaskForm initial={editTask} projectId={selectedProject.id} onSubmit={handleEdit} loading={submitting} />}
          </Modal>
        </>
      )}
    </ContextGuard>
  )
}
