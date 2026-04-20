import { useState, useRef, useEffect } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Zap, Users, CheckSquare,
  Building2, Tag, ChevronDown, Check, Plus,
  MessageSquare, Lock, FolderOpen
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useWorkspaceStore } from '@/store/workspaceStore'
import { workspaceService } from '@/services/workspaceService'
import { projectService } from '@/services/projectService'
import { showToast } from '@/components/ui/Toast'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'

const NAV = [
  { to: '/dashboard',  icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/allocation', icon: Zap,             label: 'Allocation' },
  { to: '/team',       icon: Users,           label: 'Team' },
  { to: '/tasks',      icon: CheckSquare,     label: 'Tasks' },
  { to: '/workspace',  icon: Building2,       label: 'Workspace' },
]

function SelectorButton({ label, value, onClick }: { label: string; value: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-void-3 transition-colors group">
      <div className="flex flex-col items-start min-w-0">
        <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#4A4A44] mb-0.5">{label}</span>
        <span className="text-[13px] font-medium text-[#D4D1CA] truncate max-w-[140px]">{value}</span>
      </div>
      <ChevronDown size={13} className="text-[#4A4A44] group-hover:text-[#8A8A82] transition-colors flex-shrink-0 ml-1" />
    </button>
  )
}

function Dropdown({
  open, onClose, children, anchorRef
}: {
  open: boolean; onClose: () => void; children: React.ReactNode; anchorRef: React.RefObject<HTMLDivElement>
}) {
  useEffect(() => {
    const fn = (e: MouseEvent) => {
      if (!anchorRef.current?.contains(e.target as Node)) onClose()
    }
    if (open) document.addEventListener('mousedown', fn)
    return () => document.removeEventListener('mousedown', fn)
  }, [open, onClose, anchorRef])

  if (!open) return null
  return (
    <div className="absolute left-3 right-3 top-full mt-1 bg-[#1A1A17] border border-void-border rounded-xl shadow-drop z-50 overflow-hidden animate-slide-down">
      {children}
    </div>
  )
}

export default function Sidebar() {
  const navigate = useNavigate()
  const {
    workspaces, projects, selectedWorkspace, selectedProject,
    selectWorkspace, selectProject, addWorkspace, setProjects, setLoading,
  } = useWorkspaceStore()

  const [wsOpen, setWsOpen] = useState(false)
  const [projOpen, setProjOpen] = useState(false)
  const [createWsOpen, setCreateWsOpen] = useState(false)
  const [joinWsOpen, setJoinWsOpen] = useState(false)
  const [createProjOpen, setCreateProjOpen] = useState(false)
  const [wsName, setWsName] = useState('')
  const [joinCode, setJoinCode] = useState('')
  const [projName, setProjName] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const wsRef = useRef<HTMLDivElement>(null!)
  const projRef = useRef<HTMLDivElement>(null!)

  const handleSelectWorkspace = async (ws: typeof workspaces[0]) => {
    selectWorkspace(ws); setWsOpen(false); setLoading(true)
    try {
      const projs = await projectService.list(ws.id)
      setProjects(projs)
      if (projs.length > 0) selectProject(projs[0])
    } catch { /* silent */ } finally { setLoading(false) }
  }

  const handleCreateWs = async () => {
    if (!wsName.trim()) return
    setSubmitting(true)
    try {
      const ws = await workspaceService.create(wsName.trim())
      addWorkspace(ws); selectWorkspace(ws); setProjects([])
      setCreateWsOpen(false); setWsName(''); showToast('Workspace created')
    } catch { showToast('Failed to create workspace', 'error') }
    finally { setSubmitting(false) }
  }

  const handleJoinWs = async () => {
    if (!joinCode.trim()) return
    setSubmitting(true)
    try {
      const ws = await workspaceService.join(joinCode.trim().toUpperCase())
      addWorkspace(ws); selectWorkspace(ws)
      setJoinWsOpen(false); setJoinCode(''); showToast('Joined workspace')
    } catch { showToast('Invalid join code', 'error') }
    finally { setSubmitting(false) }
  }

  const handleCreateProj = async () => {
    if (!projName.trim() || !selectedWorkspace) return
    setSubmitting(true)
    try {
      const proj = await projectService.create(projName.trim(), selectedWorkspace.id)
      useWorkspaceStore.getState().addProject(proj); selectProject(proj)
      setCreateProjOpen(false); setProjName(''); showToast('Project created')
    } catch { showToast('Failed to create project', 'error') }
    finally { setSubmitting(false) }
  }

  return (
    <>
      <aside className="w-[220px] min-h-screen bg-void flex flex-col flex-shrink-0 border-r border-void-border">

        {/* Logo */}
        <div className="flex items-center gap-2.5 px-4 py-4 border-b border-void-border">
          <div className="w-7 h-7 rounded-lg bg-violet flex items-center justify-center flex-shrink-0">
            <Zap size={14} className="text-white" strokeWidth={2.5} />
          </div>
          <span className="text-[15px] font-bold text-[#ECEAE4] tracking-tight">Allocra</span>
        </div>

        {/* Context selectors */}
        <div className="px-1 py-3 border-b border-void-border space-y-0.5">
          {/* Workspace selector */}
          <div ref={wsRef} className="relative">
            <SelectorButton
              label="Workspace"
              value={selectedWorkspace?.name || 'Select workspace'}
              onClick={() => { setWsOpen(o => !o); setProjOpen(false) }}
            />
            <Dropdown open={wsOpen} onClose={() => setWsOpen(false)} anchorRef={wsRef}>
              <div className="max-h-44 overflow-y-auto">
                {workspaces.length === 0 && (
                  <p className="px-4 py-3 text-xs text-[#6B6B66]">No workspaces yet</p>
                )}
                {workspaces.map(ws => (
                  <button key={ws.id} onClick={() => handleSelectWorkspace(ws)}
                    className="w-full flex items-center justify-between px-4 py-2.5 text-[13px] text-[#C4C1BA] hover:bg-void-3 hover:text-[#ECEAE4] text-left transition-colors">
                    <span className="truncate">{ws.name}</span>
                    {selectedWorkspace?.id === ws.id && <Check size={12} className="text-violet flex-shrink-0" />}
                  </button>
                ))}
              </div>
              <div className="border-t border-void-border">
                <button onClick={() => { setCreateWsOpen(true); setWsOpen(false) }}
                  className="w-full flex items-center gap-2 px-4 py-2.5 text-[13px] text-violet hover:bg-void-3 text-left transition-colors">
                  <Plus size={12} /> Create workspace
                </button>
                <button onClick={() => { setJoinWsOpen(true); setWsOpen(false) }}
                  className="w-full flex items-center gap-2 px-4 py-2.5 text-[13px] text-[#8A8A82] hover:bg-void-3 hover:text-[#C4C1BA] text-left transition-colors">
                  <Plus size={12} /> Join with code
                </button>
              </div>
            </Dropdown>
          </div>

          {/* Project selector */}
          <div ref={projRef} className="relative">
            <SelectorButton
              label="Project"
              value={selectedProject?.name || 'Select project'}
              onClick={() => { if (selectedWorkspace) { setProjOpen(o => !o); setWsOpen(false) } }}
            />
            <Dropdown open={projOpen} onClose={() => setProjOpen(false)} anchorRef={projRef}>
              <div className="max-h-44 overflow-y-auto">
                {projects.length === 0 && (
                  <p className="px-4 py-3 text-xs text-[#6B6B66]">No projects yet</p>
                )}
                {projects.map(p => (
                  <button key={p.id} onClick={() => { selectProject(p); setProjOpen(false) }}
                    className="w-full flex items-center justify-between px-4 py-2.5 text-[13px] text-[#C4C1BA] hover:bg-void-3 hover:text-[#ECEAE4] text-left transition-colors">
                    <span className="truncate">{p.name}</span>
                    {selectedProject?.id === p.id && <Check size={12} className="text-violet flex-shrink-0" />}
                  </button>
                ))}
              </div>
              <div className="border-t border-void-border">
                <button onClick={() => { setCreateProjOpen(true); setProjOpen(false) }}
                  className="w-full flex items-center gap-2 px-4 py-2.5 text-[13px] text-violet hover:bg-void-3 text-left transition-colors">
                  <Plus size={12} /> Create project
                </button>
              </div>
            </Dropdown>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-2 py-3">
          <p className="section-label mb-2">Navigation</p>
          <div className="space-y-0.5">
            {NAV.map(({ to, icon: Icon, label }) => (
              <NavLink key={to} to={to}
                className={({ isActive }) => cn('nav-link', isActive && 'active')}>
                <Icon size={15} strokeWidth={1.75} />
                {label}
              </NavLink>
            ))}
            {/* Chat — Pro gated */}
            <button
              onClick={() => navigate('/chat')}
              className="nav-link w-full justify-between group"
            >
              <div className="flex items-center gap-2.5">
                <MessageSquare size={15} strokeWidth={1.75} />
                Chat
              </div>
              <span className="text-[9px] font-bold uppercase tracking-wide text-violet bg-violet/15 px-1.5 py-0.5 rounded">PRO</span>
            </button>
          </div>
        </nav>

        {/* Bottom — Upgrade CTA */}
        <div className="px-2 py-3 border-t border-void-border">
          <button onClick={() => navigate('/pricing')}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg border border-violet/20 bg-violet/8 hover:bg-violet/15 transition-all group">
            <div className="w-6 h-6 rounded-md bg-violet/20 flex items-center justify-center flex-shrink-0">
              <Tag size={11} className="text-violet" />
            </div>
            <div className="flex-1 text-left">
              <p className="text-[12px] font-semibold text-violet">Upgrade to Pro</p>
              <p className="text-[10px] text-[#4A4A44]">You're on Free</p>
            </div>
          </button>
        </div>
      </aside>

      {/* Modals triggered from sidebar */}
      <Modal open={createWsOpen} onClose={() => setCreateWsOpen(false)} title="Create Workspace" subtitle="Give your team a home">
        <div className="space-y-4">
          <div><label className="block text-xs font-semibold text-ink-2 mb-1.5">Workspace name</label>
            <input className="field" placeholder="e.g. Acme Engineering" value={wsName} onChange={e => setWsName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleCreateWs()} autoFocus />
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="secondary" size="sm" onClick={() => setCreateWsOpen(false)}>Cancel</Button>
            <Button size="sm" loading={submitting} onClick={handleCreateWs}>Create workspace</Button>
          </div>
        </div>
      </Modal>

      <Modal open={joinWsOpen} onClose={() => setJoinWsOpen(false)} title="Join a Workspace" subtitle="Enter the invite code from your team">
        <div className="space-y-4">
          <div><label className="block text-xs font-semibold text-ink-2 mb-1.5">Invite code</label>
            <input className="field font-mono tracking-[0.3em] text-center text-base uppercase" placeholder="XXXXXX" maxLength={6} value={joinCode} onChange={e => setJoinCode(e.target.value)} autoFocus />
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="secondary" size="sm" onClick={() => setJoinWsOpen(false)}>Cancel</Button>
            <Button size="sm" loading={submitting} onClick={handleJoinWs}>Join workspace</Button>
          </div>
        </div>
      </Modal>

      <Modal open={createProjOpen} onClose={() => setCreateProjOpen(false)} title="Create Project" subtitle={`Inside ${selectedWorkspace?.name || 'workspace'}`}>
        <div className="space-y-4">
          <div><label className="block text-xs font-semibold text-ink-2 mb-1.5">Project name</label>
            <input className="field" placeholder="e.g. Backend API v2" value={projName} onChange={e => setProjName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleCreateProj()} autoFocus />
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="secondary" size="sm" onClick={() => setCreateProjOpen(false)}>Cancel</Button>
            <Button size="sm" loading={submitting} onClick={handleCreateProj}>Create project</Button>
          </div>
        </div>
      </Modal>
    </>
  )
}
