import { useEffect, useState, useLayoutEffect } from 'react'
import { Users, ChevronDown, ChevronUp, UserPlus } from 'lucide-react'
import { useWorkspaceStore } from '@/store/workspaceStore'
import { useAuthStore } from '@/store/authStore'
import { membershipService } from '@/services/membershipService'
import { MemberLoad, SkillEntry } from '@/types'
import { useLayout } from '@/components/layout/AppLayout'
import ContextGuard from '@/components/layout/ContextGuard'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import Modal from '@/components/ui/Modal'
import Avatar from '@/components/ui/Avatar'
import SkillDropdown from '@/components/ui/SkillDropdown'
import { showToast } from '@/components/ui/Toast'
import { getErrorMessage, cn } from '@/lib/utils'

function LoadBar({ pct, status }: { pct: number; status: string }) {
  const color = status === 'SAFE' ? 'bg-emerald' : status === 'WARNING' ? 'bg-amber' : 'bg-rose'
  return (
    <div className="flex items-center gap-2.5">
      <div className="flex-1 h-1.5 bg-stone rounded-full overflow-hidden">
        <div className={cn('h-full rounded-full transition-all duration-500', color)} style={{ width: `${Math.min(pct, 100)}%` }} />
      </div>
      <span className="text-xs font-mono text-ink-3 w-9 text-right">{pct.toFixed(0)}%</span>
    </div>
  )
}

function MemberRow({ member, isMe, onEditOpen }: { member: MemberLoad; isMe: boolean; onEditOpen: () => void }) {
  const [expanded, setExpanded] = useState(false)
  const statusVariant = member.status === 'SAFE' ? 'safe' : member.status === 'WARNING' ? 'warn' : 'danger'

  return (
    <>
      <tr className="cursor-pointer" onClick={() => setExpanded(e => !e)}>
        <td>
          <div className="flex items-center gap-3">
            <Avatar name={member.user_name} photo={localStorage.getItem(`avatar_${member.user_name}`)} size="md" />
            <div>
              <div className="flex items-center gap-2">
                <p className="text-[13px] font-semibold text-ink">{member.user_name}</p>
                {isMe && <span className="text-[10px] font-bold text-violet bg-violet-muted px-1.5 py-0.5 rounded uppercase tracking-wide">You</span>}
              </div>
              <p className="text-xs text-ink-3">{member.available_hours}h available / week</p>
            </div>
          </div>
        </td>
        <td>
          <div className="flex flex-wrap gap-1">
            {member.skills.slice(0, 4).map(s => (
              <span key={s.skill} className="text-[11px] font-mono bg-stone border border-border px-1.5 py-0.5 rounded text-ink-2">
                {s.skill} <span className="text-ink-3">{s.level}</span>
              </span>
            ))}
            {member.skills.length > 4 && <span className="text-xs text-ink-3">+{member.skills.length - 4}</span>}
          </div>
        </td>
        <td className="w-44"><LoadBar pct={member.load_pct} status={member.status} /></td>
        <td><Badge variant={statusVariant} dot>{member.status}</Badge></td>
        <td>
          <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
            {isMe && (
              <Button size="xs" variant="secondary" onClick={onEditOpen}>Edit profile</Button>
            )}
            {expanded ? <ChevronUp size={14} className="text-ink-3" /> : <ChevronDown size={14} className="text-ink-3" />}
          </div>
        </td>
      </tr>

      {expanded && (
        <tr>
          <td colSpan={5} className="bg-stone px-6 py-4 border-b border-border">
            <div className="grid grid-cols-3 gap-6">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-ink-3 mb-3">All Skills</p>
                {member.skills.length === 0
                  ? <p className="text-sm text-ink-3">No skills added</p>
                  : <div className="space-y-2">
                    {member.skills.map(s => (
                      <div key={s.skill} className="flex items-center justify-between">
                        <span className="text-[13px] text-ink">{s.skill}</span>
                        <div className="flex items-center gap-1.5">
                          <div className="flex gap-0.5">
                            {[1,2,3,4,5].map(i => (
                              <div key={i} className={cn('w-2 h-2 rounded-full', i <= s.level ? 'bg-violet' : 'bg-border-2')} />
                            ))}
                          </div>
                          <span className="text-[11px] text-ink-3 w-20">
                            {['','Beginner','Basic','Intermediate','Advanced','Expert'][s.level]}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                }
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-ink-3 mb-3">Capacity</p>
                <div className="space-y-2">
                  {[
                    ['Available hours', `${member.available_hours}h`],
                    ['Assigned hours', `${member.assigned_hours.toFixed(1)}h`],
                    ['Current load', `${member.load_pct.toFixed(0)}%`],
                  ].map(([k, v]) => (
                    <div key={k} className="flex items-center justify-between">
                      <span className="text-[13px] text-ink-2">{k}</span>
                      <span className="text-[13px] font-mono font-medium text-ink">{v}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-ink-3 mb-3">Load Trend</p>
                <div className="h-16 flex items-end gap-1">
                  {[40, 55, 70, member.load_pct].map((v, i) => (
                    <div key={i} className="flex-1 rounded-t-sm bg-violet/20 relative" style={{ height: `${Math.min(v, 100)}%` }}>
                      {i === 3 && <div className="absolute inset-0 rounded-t-sm bg-violet/50" />}
                    </div>
                  ))}
                </div>
                <p className="text-[10px] text-ink-3 mt-1">4-week estimate</p>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

export default function Team() {
  const { selectedProject } = useWorkspaceStore()
  const { user } = useAuthStore()
  const { setAction } = useLayout()
  const [members, setMembers] = useState<MemberLoad[]>([])
  const [loading, setLoading] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [myMember, setMyMember] = useState<MemberLoad | null>(null)
  const [skills, setSkills] = useState<SkillEntry[]>([])
  const [availHours, setAvailHours] = useState(40)
  const [saving, setSaving] = useState(false)

  useLayoutEffect(() => {
    setAction(null)
    return () => setAction(null)
  }, [])

  const fetchMembers = () => {
    if (!selectedProject) return
    setLoading(true)
    membershipService.getTeamLoad(selectedProject.id)
      .then(data => {
        setMembers(data)
        // Fix: match logged-in user by user_id
        const me = data.find(m => m.user_id === user?.id)
        if (me) { setMyMember(me); setSkills(me.skills); setAvailHours(me.available_hours) }
      })
      .catch(() => {}).finally(() => setLoading(false))
  }

  useEffect(fetchMembers, [selectedProject?.id])

  const handleSave = async () => {
    if (!myMember) return
    setSaving(true)
    try {
      await membershipService.updateSkills(myMember.membership_id, skills)
      await membershipService.updateAvailability(myMember.membership_id, availHours)
      setEditOpen(false)
      fetchMembers()
      showToast('Profile updated')
    } catch (err) { showToast(getErrorMessage(err), 'error') }
    finally { setSaving(false) }
  }

  return (
    <ContextGuard requireProject>
      <div className="page">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="text-lg font-bold text-ink">Team</h2>
            <p className="text-sm text-ink-3 mt-0.5">{members.length} member{members.length !== 1 ? 's' : ''} · click a row to expand</p>
          </div>
          {myMember && (
            <Button size="sm" variant="secondary" icon={<UserPlus size={13} />} onClick={() => setEditOpen(true)}>
              Edit my profile
            </Button>
          )}
        </div>

        <div className="card overflow-hidden">
          {loading ? (
            <div className="p-6 space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="skeleton w-9 h-9 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <div className="skeleton h-3 w-32 rounded" />
                    <div className="skeleton h-1.5 w-full rounded-full" />
                  </div>
                </div>
              ))}
            </div>
          ) : members.length === 0 ? (
            <div className="p-16 text-center">
              <Users size={32} className="text-ink-3 mx-auto mb-3" />
              <p className="text-sm font-semibold text-ink mb-1">No team members yet</p>
              <p className="text-sm text-ink-3">Add members to this project from the Workspace page.</p>
            </div>
          ) : (
            <table className="tbl">
              <thead>
                <tr>
                  <th>Member</th><th>Skills</th><th className="w-44">Load</th><th>Status</th><th className="w-28"></th>
                </tr>
              </thead>
              <tbody>
                {members.map(m => (
                  <MemberRow
                    key={m.user_id}
                    member={m}
                    isMe={m.user_id === user?.id}
                    onEditOpen={() => {
                      setMyMember(m)
                      setSkills(m.skills)
                      setAvailHours(m.available_hours)
                      setEditOpen(true)
                    }}
                  />
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Edit Your Profile" subtitle="Skills and availability are project-specific" width="lg">
        <div className="space-y-6">
          <div>
            <label className="block text-[12px] font-bold uppercase tracking-wide text-ink-2 mb-2">
              Available hours per week
            </label>
            <div className="flex items-center gap-3">
              <input type="number" min={1} max={80} className="field w-28"
                value={availHours} onChange={e => setAvailHours(Number(e.target.value))} />
              <span className="text-sm text-ink-3">hours / week</span>
            </div>
          </div>
          <div>
            <label className="block text-[12px] font-bold uppercase tracking-wide text-ink-2 mb-2">Skills</label>
            <SkillDropdown value={skills} onChange={setSkills} />
          </div>
          <div className="flex gap-2 justify-end pt-2 border-t border-border">
            <Button variant="secondary" size="sm" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button size="sm" loading={saving} onClick={handleSave}>Save changes</Button>
          </div>
        </div>
      </Modal>
    </ContextGuard>
  )
}
