import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Zap } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { useWorkspaceStore } from '@/store/workspaceStore'
import { authService } from '@/services/authService'
import { workspaceService } from '@/services/workspaceService'
import { projectService } from '@/services/projectService'
import { getErrorMessage } from '@/lib/utils'
import Button from '@/components/ui/Button'

export default function Login() {
  const navigate = useNavigate()
  const { setAuth } = useAuthStore()
  const { setWorkspaces, setProjects, selectWorkspace, selectProject } = useWorkspaceStore()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async () => {
    if (!email || !password) { setError('Please fill in all fields'); return }
    setLoading(true); setError('')
    try {
      const res = await authService.login(email, password)
      setAuth(res.user, res.access_token)
      const wss = await workspaceService.list()
      setWorkspaces(wss)
      if (wss.length > 0) {
        selectWorkspace(wss[0])
        const projs = await projectService.list(wss[0].id)
        setProjects(projs)
        if (projs.length > 0) selectProject(projs[0])
      }
      navigate('/dashboard')
    } catch (err) { setError(getErrorMessage(err)) }
    finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen bg-stone flex items-center justify-center p-4">
      <div className="w-full max-w-[380px]">
        {/* Logo */}
        <div className="flex items-center gap-2.5 justify-center mb-8">
          <div className="w-9 h-9 rounded-xl bg-violet flex items-center justify-center shadow-lift">
            <Zap size={17} className="text-white" strokeWidth={2.5} />
          </div>
          <span className="text-xl font-bold text-ink tracking-tight">Allocra</span>
        </div>

        <div className="bg-white rounded-2xl border border-border shadow-lift p-8">
          <h1 className="text-[18px] font-bold text-ink mb-1">Welcome back</h1>
          <p className="text-sm text-ink-3 mb-6">Sign in to your team workspace</p>

          {error && (
            <div className="px-4 py-3 rounded-lg bg-rose-bg border border-rose/20 text-sm text-rose mb-5 font-medium">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-[12px] font-semibold text-ink-2 mb-1.5 uppercase tracking-wide">Email</label>
              <input type="email" className="field" placeholder="you@company.com"
                value={email} onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSubmit()} autoFocus />
            </div>
            <div>
              <label className="block text-[12px] font-semibold text-ink-2 mb-1.5 uppercase tracking-wide">Password</label>
              <div className="relative">
                <input type={showPass ? 'text' : 'password'} className="field pr-10"
                  placeholder="••••••••" value={password}
                  onChange={e => setPassword(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSubmit()} />
                <button type="button" onClick={() => setShowPass(s => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-3 hover:text-ink transition-colors">
                  {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>
            <Button className="w-full" size="lg" loading={loading} onClick={handleSubmit}>
              Sign in
            </Button>
          </div>
        </div>

        <p className="text-center text-sm text-ink-3 mt-5">
          Don't have an account?{' '}
          <Link to="/signup" className="text-violet font-semibold hover:underline">Sign up free</Link>
        </p>
      </div>
    </div>
  )
}
