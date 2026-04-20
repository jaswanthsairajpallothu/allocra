import { Zap } from 'lucide-react'

export default function About() {
  return (
    <div className="page max-w-[600px]">
      <div className="mb-6"><h2 className="text-lg font-bold text-ink">About</h2></div>
      <div className="card p-8">
        <div className="flex items-center gap-3 mb-6 pb-6 border-b border-border">
          <div className="w-10 h-10 rounded-xl bg-violet flex items-center justify-center">
            <Zap size={18} className="text-white" strokeWidth={2.5} />
          </div>
          <div>
            <p className="text-sm font-bold text-ink">Allocra</p>
            <p className="text-xs text-ink-3">Version 2.0.0 · Decision Intelligence for Teams</p>
          </div>
        </div>
        <div className="space-y-4 text-[13px] text-ink-2 leading-relaxed">
          <p>Allocra is a decision intelligence system that helps engineering teams make better assignment decisions — before it's too late to change them.</p>
          <p>Instead of guessing who should take a task, Allocra scores every possible assignment across skill match, workload, availability, and priority — then explains exactly why it made each call.</p>
          <p className="text-xs text-ink-3 pt-2 border-t border-border">Built with FastAPI · PostgreSQL · React · Tailwind CSS</p>
        </div>
      </div>
    </div>
  )
}
