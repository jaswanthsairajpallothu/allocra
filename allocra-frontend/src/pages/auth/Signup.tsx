import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Zap } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { useWorkspaceStore } from '@/store/workspaceStore'
import { authService } from '@/services/authService'
import { workspaceService } from '@/services/workspaceService'
import { getErrorMessage } from '@/lib/utils'
import Button from '@/components/ui/Button'

export default function Signup() {
  const navigate = useNavigate()
  const { setAuth } = useAuthStore()
  const { setWorkspaces } = useWorkspaceStore()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async () => {
    if (!name || !email || !password) { setError('Please fill in all fields'); return }
    if (password.length < 8) { setError('Password must be at least 8 characters'); return }
    setLoading(true); setError('')
    try {
      const res = await authService.signup(name.trim(), email, password)
      setAuth(res.user, res.access_token)
      const wss = await workspaceService.list()
      setWorkspaces(wss)
      navigate('/dashboard')
    } catch (err) { setError(getErrorMessage(err)) }
    finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen bg-stone flex items-center justify-center p-4">
      <div className="w-full max-w-[380px]">
        <div className="flex items-center gap-2.5 justify-center mb-8">
          <div className="w-9 h-9 rounded-xl bg-violet flex items-center justify-center shadow-lift">
            <Zap size={17} className="text-white" strokeWidth={2.5} />
          </div>
          <span className="text-xl font-bold text-ink tracking-tight">Allocra</span>
        </div>

        <div className="bg-white rounded-2xl border border-border shadow-lift p-8">
          <h1 className="text-[18px] font-bold text-ink mb-1">Create your account</h1>
          <p className="text-sm text-ink-3 mb-6">Make smarter team decisions from day one</p>

          {error && (
            <div className="px-4 py-3 rounded-lg bg-rose-bg border border-rose/20 text-sm text-rose mb-5 font-medium">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-[12px] font-semibold text-ink-2 mb-1.5 uppercase tracking-wide">Full name</label>
              <input className="field" placeholder="Raj Sharma"
                value={name} onChange={e => setName(e.target.value)} autoFocus />
            </div>
            <div>
              <label className="block text-[12px] font-semibold text-ink-2 mb-1.5 uppercase tracking-wide">Work email</label>
              <input type="email" className="field" placeholder="you@company.com"
                value={email} onChange={e => setEmail(e.target.value)} />
            </div>
            <div>
              <label className="block text-[12px] font-semibold text-ink-2 mb-1.5 uppercase tracking-wide">Password</label>
              <div className="relative">
                <input type={showPass ? 'text' : 'password'} className="field pr-10"
                  placeholder="Min. 8 characters" value={password}
                  onChange={e => setPassword(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSubmit()} />
                <button type="button" onClick={() => setShowPass(s => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-3 hover:text-ink transition-colors">
                  {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>
            <Button className="w-full" size="lg" loading={loading} onClick={handleSubmit}>
              Create account
            </Button>
          </div>
        </div>

        <p className="text-center text-sm text-ink-3 mt-5">
          Already have an account?{' '}
          <Link to="/login" className="text-violet font-semibold hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  )
}
