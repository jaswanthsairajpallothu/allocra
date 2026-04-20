import { useState } from 'react'
import { Building2, FolderOpen, Users, Copy, Check, Plus, Link as LinkIcon } from 'lucide-react'
import { useWorkspaceStore } from '@/store/workspaceStore'
import { workspaceService } from '@/services/workspaceService'
import { projectService } from '@/services/projectService'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import { showToast } from '@/components/ui/Toast'
import { getErrorMessage, cn } from '@/lib/utils'

export default function Workspace() {
  const { workspaces, projects, selectedWorkspace, selectedProject, addWorkspace, setProjects, selectWorkspace, selectProject, addProject } = useWorkspaceStore()
  const [createWsOpen, setCreateWsOpen] = useState(false)
  const [joinWsOpen, setJoinWsOpen] = useState(false)
  const [createProjOpen, setCreateProjOpen] = useState(false)
  const [addMemberOpen, setAddMemberOpen] = useState(false)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [wsName, setWsName] = useState('')
  const [joinCode, setJoinCode] = useState('')
  const [projName, setProjName] = useState('')
  const [memberId, setMemberId] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [copied, setCopied] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const handleCreateWs = async () => {
    if (!wsName.trim()) return
    setSubmitting(true)
    try {
      const ws = await workspaceService.create(wsName.trim())
      addWorkspace(ws); selectWorkspace(ws); setProjects([])
      setCreateWsOpen(false); setWsName(''); showToast('Workspace created')
    } catch (err) { showToast(getErrorMessage(err), 'error') }
    finally { setSubmitting(false) }
  }

  const handleJoinWs = async () => {
    if (!joinCode.trim()) return
    setSubmitting(true)
    try {
      const ws = await workspaceService.join(joinCode.trim().toUpperCase())
      addWorkspace(ws); selectWorkspace(ws)
      setJoinWsOpen(false); setJoinCode(''); showToast('Joined workspace')
    } catch (err) { showToast(getErrorMessage(err), 'error') }
    finally { setSubmitting(false) }
  }

  const handleCreateProj = async () => {
    if (!projName.trim() || !selectedWorkspace) return
    setSubmitting(true)
    try {
      const p = await projectService.create(projName.trim(), selectedWorkspace.id)
      addProject(p); selectProject(p)
      setCreateProjOpen(false); setProjName(''); showToast('Project created')
    } catch (err) { showToast(getErrorMessage(err), 'error') }
    finally { setSubmitting(false) }
  }

  const handleAddMember = async () => {
    if (!memberId.trim() || !selectedProject) return
    setSubmitting(true)
    try {
      await projectService.addMember(selectedProject.id, memberId.trim())
      setAddMemberOpen(false); setMemberId(''); showToast('Member added')
    } catch (err) { showToast(getErrorMessage(err), 'error') }
    finally { setSubmitting(false) }
  }

  const handleGetInvite = async () => {
    if (!selectedWorkspace) return
    try {
      const res = await workspaceService.getInvite(selectedWorkspace.id)
      setInviteCode(res.join_code); setInviteOpen(true)
    } catch (err) { showToast(getErrorMessage(err), 'error') }
  }

  const copy = () => { navigator.clipboard.writeText(inviteCode); setCopied(true); setTimeout(() => setCopied(false), 2000) }

  return (
    <div className="page">
      <div className="mb-6">
        <h2 className="text-lg font-bold text-ink">Workspace & Projects</h2>
        <p className="text-sm text-ink-3 mt-0.5">Manage your team structure and access</p>
      </div>

      <div className="grid grid-cols-2 gap-5">
        {/* Workspaces */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-ink">Workspaces</h3>
            <div className="flex gap-2">
              <Button size="xs" variant="secondary" onClick={() => setJoinWsOpen(true)}>Join</Button>
              <Button size="xs" icon={<Plus size={11} />} onClick={() => setCreateWsOpen(true)}>New</Button>
            </div>
          </div>
          {workspaces.length === 0 ? (
            <div className="py-10 text-center">
              <Building2 size={28} className="text-ink-3 mx-auto mb-2" />
              <p className="text-sm text-ink-3 mb-3">No workspaces yet</p>
              <Button size="xs" icon={<Plus size={11} />} onClick={() => setCreateWsOpen(true)}>Create workspace</Button>
            </div>
          ) : (
            <div className="space-y-1.5">
              {workspaces.map(ws => (
                <button key={ws.id} onClick={() => { selectWorkspace(ws); projectService.list(ws.id).then(projs => { setProjects(projs); if(projs.length>0) selectProject(projs[0]) }).catch(()=>{}) }}
                  className={cn('w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all text-left',
                    selectedWorkspace?.id === ws.id ? 'bg-violet-muted border border-violet/20' : 'hover:bg-stone border border-transparent')}>
                  <div className="w-8 h-8 rounded-lg bg-violet/10 flex items-center justify-center flex-shrink-0">
                    <Building2 size={14} className="text-violet" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-ink truncate">{ws.name}</p>
                    <p className="text-[11px] font-mono text-ink-3">{ws.join_code}</p>
                  </div>
                  {selectedWorkspace?.id === ws.id && (
                    <button onClick={e => { e.stopPropagation(); handleGetInvite() }}
                      className="flex items-center gap-1 text-[11px] text-violet hover:underline flex-shrink-0">
                      <LinkIcon size={10} /> Invite
                    </button>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Projects */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-ink">Projects</h3>
              {selectedWorkspace && <p className="text-[11px] text-ink-3 mt-0.5">in {selectedWorkspace.name}</p>}
            </div>
            {selectedWorkspace && <Button size="xs" icon={<Plus size={11} />} onClick={() => setCreateProjOpen(true)}>New</Button>}
          </div>

          {!selectedWorkspace ? (
            <div className="py-10 text-center"><p className="text-sm text-ink-3">Select a workspace first</p></div>
          ) : projects.length === 0 ? (
            <div className="py-10 text-center">
              <FolderOpen size={28} className="text-ink-3 mx-auto mb-2" />
              <p className="text-sm text-ink-3 mb-3">No projects yet</p>
              <Button size="xs" icon={<Plus size={11} />} onClick={() => setCreateProjOpen(true)}>Create project</Button>
            </div>
          ) : (
            <div className="space-y-1.5">
              {projects.map(p => (
                <button key={p.id} onClick={() => selectProject(p)}
                  className={cn('w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all text-left',
                    selectedProject?.id === p.id ? 'bg-violet-muted border border-violet/20' : 'hover:bg-stone border border-transparent')}>
                  <div className="w-8 h-8 rounded-lg bg-emerald-bg flex items-center justify-center flex-shrink-0">
                    <FolderOpen size={14} className="text-emerald" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-ink truncate">{p.name}</p>
                    {p.description && <p className="text-[11px] text-ink-3 truncate">{p.description}</p>}
                  </div>
                  {selectedProject?.id === p.id && (
                    <button onClick={e => { e.stopPropagation(); setAddMemberOpen(true) }}
                      className="flex items-center gap-1 text-[11px] text-violet hover:underline flex-shrink-0">
                      <Users size={10} /> Members
                    </button>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <Modal open={createWsOpen} onClose={() => setCreateWsOpen(false)} title="Create Workspace">
        <div className="space-y-4">
          <div><label className="block text-[12px] font-bold uppercase tracking-wide text-ink-2 mb-1.5">Name</label>
            <input className="field" placeholder="e.g. Acme Engineering" value={wsName} onChange={e => setWsName(e.target.value)} autoFocus onKeyDown={e => e.key === 'Enter' && handleCreateWs()} />
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="secondary" size="sm" onClick={() => setCreateWsOpen(false)}>Cancel</Button>
            <Button size="sm" loading={submitting} onClick={handleCreateWs}>Create</Button>
          </div>
        </div>
      </Modal>

      <Modal open={joinWsOpen} onClose={() => setJoinWsOpen(false)} title="Join Workspace" subtitle="Enter the 6-character invite code">
        <div className="space-y-4">
          <input className="field font-mono tracking-[0.4em] text-center text-lg uppercase" placeholder="XXXXXX" maxLength={6} value={joinCode} onChange={e => setJoinCode(e.target.value)} autoFocus />
          <div className="flex gap-2 justify-end">
            <Button variant="secondary" size="sm" onClick={() => setJoinWsOpen(false)}>Cancel</Button>
            <Button size="sm" loading={submitting} onClick={handleJoinWs}>Join</Button>
          </div>
        </div>
      </Modal>

      <Modal open={createProjOpen} onClose={() => setCreateProjOpen(false)} title="Create Project" subtitle={`Inside ${selectedWorkspace?.name || ''}`}>
        <div className="space-y-4">
          <div><label className="block text-[12px] font-bold uppercase tracking-wide text-ink-2 mb-1.5">Name</label>
            <input className="field" placeholder="e.g. Backend API v2" value={projName} onChange={e => setProjName(e.target.value)} autoFocus onKeyDown={e => e.key === 'Enter' && handleCreateProj()} />
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="secondary" size="sm" onClick={() => setCreateProjOpen(false)}>Cancel</Button>
            <Button size="sm" loading={submitting} onClick={handleCreateProj}>Create</Button>
          </div>
        </div>
      </Modal>

      <Modal open={addMemberOpen} onClose={() => setAddMemberOpen(false)} title="Add Member" subtitle={`To project: ${selectedProject?.name}`}>
        <div className="space-y-4">
          <p className="text-xs text-ink-3 bg-stone border border-border rounded-lg px-3 py-2">
            The user must already be a workspace member. Enter their User ID from their Profile page.
          </p>
          <div><label className="block text-[12px] font-bold uppercase tracking-wide text-ink-2 mb-1.5">User ID</label>
            <input className="field font-mono text-xs" placeholder="uuid-here" value={memberId} onChange={e => setMemberId(e.target.value)} autoFocus />
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="secondary" size="sm" onClick={() => setAddMemberOpen(false)}>Cancel</Button>
            <Button size="sm" loading={submitting} onClick={handleAddMember}>Add member</Button>
          </div>
        </div>
      </Modal>

      <Modal open={inviteOpen} onClose={() => setInviteOpen(false)} title="Invite Link" subtitle={`Share to join ${selectedWorkspace?.name}`}>
        <div className="space-y-4">
          <div className="flex items-center justify-between px-5 py-4 rounded-xl bg-stone border border-border">
            <span className="font-mono text-2xl font-bold text-ink tracking-[0.35em]">{inviteCode}</span>
            <button onClick={copy} className={cn('flex items-center gap-1.5 text-sm font-semibold transition-colors px-3 py-1.5 rounded-lg', copied ? 'text-emerald bg-emerald-bg' : 'text-violet hover:bg-violet-muted')}>
              {copied ? <><Check size={13} /> Copied</> : <><Copy size={13} /> Copy</>}
            </button>
          </div>
          <p className="text-xs text-ink-3 text-center">This code can be reused. Share it with your team to let them join.</p>
        </div>
      </Modal>
    </div>
  )
}
