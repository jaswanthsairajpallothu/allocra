import { useNavigate } from 'react-router-dom'
import Button from '@/components/ui/Button'

export default function NotFound() {
  const navigate = useNavigate()
  return (
    <div className="min-h-screen bg-stone flex items-center justify-center">
      <div className="text-center">
        <p className="text-8xl font-bold text-border mb-4">404</p>
        <h1 className="text-lg font-bold text-ink mb-1.5">Page not found</h1>
        <p className="text-sm text-ink-3 mb-6">This page doesn't exist or was moved.</p>
        <Button onClick={() => navigate('/dashboard')}>Go to Dashboard</Button>
      </div>
    </div>
  )
}
