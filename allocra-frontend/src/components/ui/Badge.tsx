import { cn } from '@/lib/utils'

type Variant = 'default' | 'safe' | 'warn' | 'danger' | 'violet' | 'low' | 'medium' | 'high' | 'pro'

interface BadgeProps { children: React.ReactNode; variant?: Variant; className?: string; dot?: boolean }

const styles: Record<Variant, string> = {
  default: 'bg-stone text-ink-2 border-border',
  safe:    'bg-emerald-bg text-emerald border-emerald-border',
  warn:    'bg-amber-bg text-amber border-amber-border',
  danger:  'bg-rose-bg text-rose border-rose-border',
  violet:  'bg-violet-muted text-violet border-violet-subtle',
  low:     'bg-emerald-bg text-emerald border-emerald-border',
  medium:  'bg-amber-bg text-amber border-amber-border',
  high:    'bg-rose-bg text-rose border-rose-border',
  pro:     'bg-violet text-white border-transparent',
}

const dots: Record<Variant, string> = {
  default: 'bg-ink-3', safe: 'bg-emerald', warn: 'bg-amber',
  danger: 'bg-rose', violet: 'bg-violet', low: 'bg-emerald',
  medium: 'bg-amber', high: 'bg-rose', pro: 'bg-white',
}

export default function Badge({ children, variant = 'default', className, dot }: BadgeProps) {
  return (
    <span className={cn('badge border', styles[variant], className)}>
      {dot && <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', dots[variant])} />}
      {children}
    </span>
  )
}
