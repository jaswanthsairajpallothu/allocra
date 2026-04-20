import { Building2, FolderOpen } from 'lucide-react'
import { useWorkspaceStore } from '@/store/workspaceStore'

export default function ContextGuard({ requireProject = false, children }: { requireProject?: boolean; children: React.ReactNode }) {
  const { selectedWorkspace, selectedProject } = useWorkspaceStore()

  if (!selectedWorkspace) return (
    <div className="flex flex-col items-center justify-center h-full py-24">
      <div className="w-12 h-12 rounded-xl bg-white border border-border shadow-card flex items-center justify-center text-ink-3 mb-4">
        <Building2 size={20} />
      </div>
      <h3 className="text-sm font-semibold text-ink mb-1">No workspace selected</h3>
      <p className="text-sm text-ink-3">Use the sidebar to select or create a workspace.</p>
    </div>
  )

  if (requireProject && !selectedProject) return (
    <div className="flex flex-col items-center justify-center h-full py-24">
      <div className="w-12 h-12 rounded-xl bg-white border border-border shadow-card flex items-center justify-center text-ink-3 mb-4">
        <FolderOpen size={20} />
      </div>
      <h3 className="text-sm font-semibold text-ink mb-1">No project selected</h3>
      <p className="text-sm text-ink-3">Use the sidebar to select or create a project.</p>
    </div>
  )

  return <>{children}</>
}
