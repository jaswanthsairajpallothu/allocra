import { useState, useRef, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { LogOut, User, Info, ChevronDown, Tag } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { useWorkspaceStore } from '@/store/workspaceStore'
import Avatar from '@/components/ui/Avatar'

const PAGE_TITLES: Record<string, string> = {
  '/dashboard':  'Dashboard',
  '/allocation': 'Allocation',
  '/team':       'Team',
  '/tasks':      'Tasks',
  '/workspace':  'Workspace',
  '/pricing':    'Pricing',
  '/profile':    'Profile',
  '/about':      'About',
  '/chat':       'Project Chat',
}

export default function Topbar({ action }: { action?: React.ReactNode }) {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, logout } = useAuthStore()
  const { selectedWorkspace, selectedProject, reset } = useWorkspaceStore()
  const [open, setOpen] = useState(false)
  const [photo, setPhoto] = useState<string | null>(
    user ? localStorage.getItem(`avatar_${user.name}`) : null
  )
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const fn = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', fn)
    return () => document.removeEventListener('mousedown', fn)
  }, [])

  const handleLogout = () => {
    logout(); reset(); navigate('/login')
  }

  const title = PAGE_TITLES[location.pathname] || 'Allocra'
  const breadcrumb = selectedProject
    ? `${selectedWorkspace?.name} / ${selectedProject.name}`
    : selectedWorkspace?.name || ''

  return (
    <header className="h-12 bg-white border-b border-border flex items-center px-5 gap-4 flex-shrink-0">
      {/* Left: Page title + breadcrumb */}
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <h1 className="text-[14px] font-semibold text-ink">{title}</h1>
          {breadcrumb && (
            <span className="text-[12px] text-ink-3 truncate hidden sm:block">
              {breadcrumb}
            </span>
          )}
        </div>
      </div>

      {/* Center: page-specific action slot */}
      {action && <div className="flex-shrink-0">{action}</div>}

      {/* Right: Profile menu */}
      <div ref={ref} className="relative flex-shrink-0">
        <button
          onClick={() => setOpen(o => !o)}
          className="flex items-center gap-2 pl-2 pr-1.5 py-1.5 rounded-lg hover:bg-stone transition-colors"
        >
          <Avatar name={user?.name || 'U'} photo={photo} size="sm" />
          <span className="text-[13px] font-medium text-ink hidden sm:block max-w-[100px] truncate">
            {user?.name?.split(' ')[0]}
          </span>
          <ChevronDown size={13} className="text-ink-3" />
        </button>

        {open && (
          <div className="absolute top-full right-0 mt-1 w-48 bg-white border border-border rounded-xl shadow-drop z-50 animate-slide-down overflow-hidden">
            <div className="px-4 py-3 border-b border-border">
              <p className="text-[13px] font-semibold text-ink truncate">{user?.name}</p>
              <p className="text-[11px] text-ink-3 truncate mt-0.5">{user?.email}</p>
            </div>
            {[
              { icon: User,  label: 'Profile', to: '/profile' },
              { icon: Tag,   label: 'Pricing',  to: '/pricing' },
              { icon: Info,  label: 'About',    to: '/about' },
            ].map(({ icon: Icon, label, to }) => (
              <button key={to} onClick={() => { navigate(to); setOpen(false) }}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-[13px] text-ink hover:bg-stone text-left transition-colors">
                <Icon size={13} className="text-ink-3" />{label}
              </button>
            ))}
            <div className="border-t border-border">
              <button onClick={handleLogout}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-[13px] text-rose hover:bg-rose-bg text-left transition-colors">
                <LogOut size={13} />{' '}Logout
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  )
}
