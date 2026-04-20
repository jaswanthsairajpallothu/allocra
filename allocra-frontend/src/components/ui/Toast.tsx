import { useEffect, useState } from 'react'
import { CheckCircle2, XCircle, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ToastProps { message: string; type?: 'success' | 'error'; onClose: () => void }

function Toast({ message, type = 'success', onClose }: ToastProps) {
  useEffect(() => { const t = setTimeout(onClose, 3800); return () => clearTimeout(t) }, [onClose])
  return (
    <div className={cn(
      'fixed bottom-5 right-5 z-[100] flex items-center gap-3 px-4 py-3 rounded-xl border shadow-drop text-sm font-medium animate-slide-up max-w-xs',
      type === 'success' ? 'bg-white border-emerald-border text-ink' : 'bg-white border-rose-border text-ink'
    )}>
      {type === 'success'
        ? <CheckCircle2 size={15} className="text-emerald flex-shrink-0" />
        : <XCircle size={15} className="text-rose flex-shrink-0" />
      }
      <span className="flex-1">{message}</span>
      <button onClick={onClose} className="opacity-40 hover:opacity-100 transition-opacity flex-shrink-0"><X size={13} /></button>
    </div>
  )
}

type TState = { message: string; type: 'success' | 'error'; id: number } | null
let _set: ((t: TState) => void) | null = null

export function showToast(message: string, type: 'success' | 'error' = 'success') {
  _set?.({ message, type, id: Date.now() })
}

export function ToastProvider() {
  const [t, setT] = useState<TState>(null)
  _set = setT
  if (!t) return null
  return <Toast key={t.id} message={t.message} type={t.type} onClose={() => setT(null)} />
}
