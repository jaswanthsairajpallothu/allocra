import { useState } from 'react'
import { Mail, Calendar, Tag, Copy, Check } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { useNavigate } from 'react-router-dom'
import Button from '@/components/ui/Button'
import Avatar from '@/components/ui/Avatar'
import { showToast } from '@/components/ui/Toast'
import { formatDate, generateDisplayId } from '@/lib/utils'

export default function Profile() {
  const navigate = useNavigate()
  const { user, updateUser } = useAuthStore()
  const [name, setName] = useState(user?.name || '')
  const [saving, setSaving] = useState(false)
  const [photo, setPhoto] = useState<string | null>(
    user ? localStorage.getItem(`avatar_${user.name}`) : null
  )
  const [copied, setCopied] = useState(false)

  if (!user) return null

  // Generate a stable display ID from the UUID — stored in localStorage per user
  const displayIdKey = `display_id_${user.id}`
  const displayId = localStorage.getItem(displayIdKey) || (() => {
    const id = generateDisplayId(user.name)
    localStorage.setItem(displayIdKey, id)
    return id
  })()

  const handleSave = async () => {
    if (!name.trim() || name.trim() === user.name) return
    setSaving(true)
    try {
      updateUser({ name: name.trim() })
      showToast('Profile updated')
    } catch { showToast('Failed to update', 'error') }
    finally { setSaving(false) }
  }

  const copyId = () => {
    navigator.clipboard.writeText(displayId)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handlePhotoChange = (dataUrl: string) => {
    setPhoto(dataUrl)
    showToast('Photo updated')
  }

  return (
    <div className="page max-w-[640px]">
      <div className="mb-6">
        <h2 className="text-lg font-bold text-ink">Profile</h2>
        <p className="text-sm text-ink-3 mt-0.5">Manage your personal details</p>
      </div>

      <div className="space-y-4">
        {/* Avatar card */}
        <div className="card p-6">
          <div className="flex items-center gap-5">
            <Avatar
              name={user.name}
              photo={photo}
              size="xl"
              editable
              onPhotoChange={handlePhotoChange}
            />
            <div>
              <h3 className="text-base font-bold text-ink">{user.name}</h3>
              <p className="text-sm text-ink-3 mt-0.5">{user.email}</p>
              <div className="flex items-center gap-1.5 mt-2">
                <p className="text-[11px] text-ink-3 flex items-center gap-1">
                  <Calendar size={10} /> Joined {formatDate(user.created_at)}
                </p>
              </div>
              <p className="text-[11px] text-ink-3 mt-1">Click photo to upload a new one</p>
            </div>
          </div>
        </div>

        {/* Info card */}
        <div className="card p-6 space-y-5">
          <div>
            <label className="block text-[12px] font-bold uppercase tracking-wide text-ink-2 mb-1.5">Full name</label>
            <input className="field" value={name} onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSave()} />
          </div>
          <div>
            <label className="block text-[12px] font-bold uppercase tracking-wide text-ink-2 mb-1.5">
              <span className="flex items-center gap-1.5"><Mail size={11} /> Email address</span>
            </label>
            <input className="field opacity-50 cursor-not-allowed" value={user.email} disabled />
            <p className="text-[11px] text-ink-3 mt-1">Email cannot be changed</p>
          </div>
          <div>
            <label className="block text-[12px] font-bold uppercase tracking-wide text-ink-2 mb-1.5">Your ID</label>
            <div className="flex items-center gap-2">
              <div className="flex-1 px-3 py-2.5 rounded-lg bg-stone border border-border font-mono text-sm font-semibold text-ink tracking-wider">
                {displayId}
              </div>
              <button onClick={copyId}
                className="flex items-center gap-1.5 px-3 py-2.5 rounded-lg border border-border bg-white hover:bg-stone text-sm font-medium text-ink-2 transition-colors">
                {copied ? <><Check size={13} className="text-emerald" /> Copied</> : <><Copy size={13} /> Copy</>}
              </button>
            </div>
            <p className="text-[11px] text-ink-3 mt-1">Share this ID with workspace admins to be added to projects</p>
          </div>
          <div className="flex justify-end pt-1">
            <Button size="sm" loading={saving} onClick={handleSave} disabled={name.trim() === user.name}>
              Save changes
            </Button>
          </div>
        </div>

        {/* Plan card */}
        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-ink mb-1">Current Plan</h3>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold px-2 py-1 rounded-md bg-stone border border-border text-ink-2 uppercase tracking-wide">Free</span>
                <span className="text-sm text-ink-3">· Limited features</span>
              </div>
            </div>
            <Button size="sm" icon={<Tag size={13} />} onClick={() => navigate('/pricing')}>
              Upgrade Plan
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
