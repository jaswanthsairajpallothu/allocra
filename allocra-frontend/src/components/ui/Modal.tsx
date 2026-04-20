import { useEffect } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ModalProps {
  open: boolean; onClose: () => void; title: string
  subtitle?: string; children: React.ReactNode; width?: 'sm' | 'md' | 'lg' | 'xl'
}

export default function Modal({ open, onClose, title, subtitle, children, width = 'md' }: ModalProps) {
  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    if (open) { document.addEventListener('keydown', fn); document.body.style.overflow = 'hidden' }
    return () => { document.removeEventListener('keydown', fn); document.body.style.overflow = '' }
  }, [open, onClose])

  if (!open) return null

  const widths = { sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-lg', xl: 'max-w-2xl' }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] animate-fade" onClick={onClose} />
      <div className={cn('relative bg-white rounded-2xl shadow-modal w-full animate-scale-in', widths[width])}>
        <div className="flex items-start justify-between px-6 py-5 border-b border-border">
          <div>
            <h2 className="text-[15px] font-semibold text-ink">{title}</h2>
            {subtitle && <p className="text-xs text-ink-3 mt-0.5">{subtitle}</p>}
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-stone text-ink-3 hover:text-ink transition-colors ml-4 flex-shrink-0">
            <X size={15} />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  )
}
