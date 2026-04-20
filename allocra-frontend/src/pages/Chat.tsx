import { useNavigate } from 'react-router-dom'
import { Lock, MessageSquare, Zap } from 'lucide-react'
import Button from '@/components/ui/Button'

export default function Chat() {
  const navigate = useNavigate()
  return (
    <div className="page flex items-center justify-center min-h-[60vh]">
      <div className="text-center max-w-sm">
        <div className="relative inline-flex mb-5">
          <div className="w-16 h-16 rounded-2xl bg-violet-muted flex items-center justify-center">
            <MessageSquare size={28} className="text-violet" />
          </div>
          <div className="absolute -top-1.5 -right-1.5 w-7 h-7 rounded-full bg-amber-bg border-2 border-white flex items-center justify-center">
            <Lock size={12} className="text-amber" />
          </div>
        </div>
        <h2 className="text-base font-bold text-ink mb-2">Project Chat</h2>
        <p className="text-sm text-ink-3 mb-1">Keep team conversations attached to your project context — tasks, allocations, and decisions all in one place.</p>
        <p className="text-sm font-semibold text-amber mb-6">Available on Pro and Team plans</p>
        <Button icon={<Zap size={14} />} onClick={() => navigate('/pricing')}>
          Upgrade to Pro
        </Button>
        <p className="text-xs text-ink-3 mt-3">Starting at ₹999/month</p>
      </div>
    </div>
  )
}
