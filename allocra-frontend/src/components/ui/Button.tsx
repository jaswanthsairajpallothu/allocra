import React from 'react'
import { cn } from '@/lib/utils'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline'
  size?: 'xs' | 'sm' | 'md' | 'lg'
  loading?: boolean
  icon?: React.ReactNode
  iconRight?: React.ReactNode
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', loading, icon, iconRight, children, className, disabled, ...props }, ref) => {
    const base = 'inline-flex items-center justify-center gap-2 font-semibold rounded-lg transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet/30 focus-visible:ring-offset-1 disabled:opacity-40 disabled:cursor-not-allowed select-none whitespace-nowrap'

    const variants = {
      primary:   'bg-violet text-white hover:bg-violet-hover shadow-xs active:scale-[0.98]',
      secondary: 'bg-white text-ink border border-border hover:bg-stone hover:border-border-2 shadow-xs active:scale-[0.98]',
      ghost:     'text-ink-2 hover:bg-stone hover:text-ink active:scale-[0.98]',
      danger:    'bg-rose text-white hover:bg-red-600 shadow-xs active:scale-[0.98]',
      outline:   'border border-violet text-violet hover:bg-violet-muted active:scale-[0.98]',
    }

    const sizes = {
      xs: 'text-[11px] px-2 py-1 h-6 gap-1',
      sm: 'text-xs px-2.5 py-1.5 h-7',
      md: 'text-sm px-3.5 py-2 h-9',
      lg: 'text-sm px-5 py-2.5 h-10',
    }

    return (
      <button ref={ref} className={cn(base, variants[variant], sizes[size], className)} disabled={disabled || loading} {...props}>
        {loading
          ? <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin opacity-70 flex-shrink-0" />
          : icon && <span className="flex-shrink-0">{icon}</span>
        }
        {children}
        {iconRight && <span className="flex-shrink-0 ml-0.5">{iconRight}</span>}
      </button>
    )
  }
)
Button.displayName = 'Button'
export default Button
