import { useRef } from 'react'
import { Camera } from 'lucide-react'
import { cn, getInitials } from '@/lib/utils'

interface AvatarProps {
  name: string
  photo?: string | null
  size?: 'sm' | 'md' | 'lg' | 'xl'
  editable?: boolean
  onPhotoChange?: (dataUrl: string) => void
  className?: string
}

const sizes = {
  sm: 'w-7 h-7 text-[10px]',
  md: 'w-9 h-9 text-xs',
  lg: 'w-12 h-12 text-sm',
  xl: 'w-20 h-20 text-xl',
}

// Generate a stable color from name
function colorFromName(name: string): string {
  const colors = [
    'bg-violet text-white',
    'bg-indigo-500 text-white',
    'bg-blue-500 text-white',
    'bg-emerald text-white',
    'bg-amber text-white',
    'bg-rose text-white',
    'bg-purple-500 text-white',
    'bg-teal-500 text-white',
  ]
  const index = name.charCodeAt(0) % colors.length
  return colors[index]
}

export default function Avatar({ name, photo, size = 'md', editable, onPhotoChange, className }: AvatarProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = reader.result as string
      localStorage.setItem(`avatar_${name}`, dataUrl)
      onPhotoChange?.(dataUrl)
    }
    reader.readAsDataURL(file)
  }

  const colorClass = colorFromName(name)

  return (
    <div className={cn('relative inline-flex flex-shrink-0', className)}>
      {photo
        ? <img src={photo} alt={name} className={cn('rounded-full object-cover', sizes[size])} />
        : (
          <div className={cn('rounded-full flex items-center justify-center font-bold flex-shrink-0', sizes[size], colorClass)}>
            {getInitials(name)}
          </div>
        )
      }
      {editable && (
        <>
          <button
            onClick={() => inputRef.current?.click()}
            className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity cursor-pointer"
          >
            <Camera size={size === 'xl' ? 20 : 14} className="text-white" />
          </button>
          <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
        </>
      )}
    </div>
  )
}
