import { Check, Zap, Lock } from 'lucide-react'
import { cn } from '@/lib/utils'
import Button from '@/components/ui/Button'

const PLANS = [
  {
    name: 'Free', price: '₹0', period: 'forever',
    desc: 'Get started with core allocation', highlight: false, current: true,
    features: ['1 workspace', '3 projects / workspace', '10 members / project', 'Basic allocation', 'Task management', 'Workspace invite codes'],
    locked: ['Advanced scoring', 'Workload visibility', 'Risk engine', 'Optimization suggestions', 'Project chat'],
  },
  {
    name: 'Pro', price: '₹999', period: 'per month',
    desc: 'For growing teams that need clarity', highlight: false, current: false,
    features: ['3 workspaces', '6 projects / workspace', '20 members / project', 'Advanced scoring with full breakdown', 'Workload visibility', 'Allocation history', 'Project chat (coming soon)'],
    locked: ['Risk engine', 'Optimization suggestions', 'Team analytics'],
  },
  {
    name: 'Team', price: '₹2,499', period: 'per month',
    desc: 'When bad decisions cost real money', highlight: true, current: false,
    features: ['10 workspaces', '12 projects / workspace', '20 members / project', 'Everything in Pro', 'Risk engine (skill + overload + availability)', 'Workload optimization suggestions', 'Skill gap & dependency insights', 'Team analytics dashboard', 'Priority support'],
    locked: [],
  },
]

export default function Pricing() {
  return (
    <div className="page max-w-4xl">
      <div className="mb-8 text-center">
        <h2 className="text-2xl font-bold text-ink">Pricing</h2>
        <p className="text-ink-3 mt-1.5">One bad assignment decision costs more than a year's subscription.</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {PLANS.map(plan => (
          <div key={plan.name} className={cn('rounded-2xl border p-6 flex flex-col relative',
            plan.highlight ? 'border-violet shadow-drop bg-white' : 'card')}>
            {plan.highlight && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="bg-violet text-white text-[11px] font-bold px-3 py-1 rounded-full uppercase tracking-wide shadow-xs">Most Popular</span>
              </div>
            )}

            <div className="mb-5">
              <div className="flex items-center gap-2 mb-2">
                <p className="text-base font-bold text-ink">{plan.name}</p>
                {plan.current && <span className="text-[10px] font-bold bg-stone border border-border text-ink-3 px-1.5 py-0.5 rounded uppercase tracking-wide">Current</span>}
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-bold text-ink">{plan.price}</span>
                <span className="text-sm text-ink-3">/{plan.period}</span>
              </div>
              <p className="text-xs text-ink-3 mt-1.5">{plan.desc}</p>
            </div>

            <div className="flex-1 space-y-2 mb-6">
              {plan.features.map(f => (
                <div key={f} className="flex items-start gap-2">
                  <Check size={13} className="text-emerald mt-0.5 flex-shrink-0" />
                  <span className="text-[13px] text-ink">{f}</span>
                </div>
              ))}
              {plan.locked.map(f => (
                <div key={f} className="flex items-start gap-2 opacity-35">
                  <Lock size={11} className="text-ink-3 mt-1 flex-shrink-0" />
                  <span className="text-[13px] text-ink-3">{f}</span>
                </div>
              ))}
            </div>

            <Button
              variant={plan.highlight ? 'primary' : plan.current ? 'secondary' : 'outline'}
              className="w-full"
              disabled={plan.current}
              icon={!plan.current ? <Zap size={13} /> : undefined}
            >
              {plan.current ? 'Current plan' : `Upgrade to ${plan.name}`}
            </Button>
          </div>
        ))}
      </div>

      <p className="text-center text-xs text-ink-3 mt-6">
        All prices in INR. Cancel anytime. No questions asked.
      </p>
    </div>
  )
}
