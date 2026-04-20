import { useState, useLayoutEffect } from 'react'
import { Zap, ChevronDown, ChevronUp, AlertTriangle, Info, BarChart2 } from 'lucide-react'
import { useWorkspaceStore } from '@/store/workspaceStore'
import { allocationService } from '@/services/allocationService'
import { AllocationRun, TaskAllocationResult } from '@/types'
import { useLayout } from '@/components/layout/AppLayout'
import ContextGuard from '@/components/layout/ContextGuard'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import Avatar from '@/components/ui/Avatar'
import { showToast } from '@/components/ui/Toast'
import { getErrorMessage, cn } from '@/lib/utils'

function ScoreBar({ label, value, max }: { label: string; value: number; max: number }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-ink-3 w-20 flex-shrink-0">{label}</span>
      <div className="flex-1 h-1.5 bg-stone rounded-full overflow-hidden">
        <div className="h-full bg-violet rounded-full transition-all" style={{ width: `${(value/max)*100}%` }} />
      </div>
      <span className="text-xs font-mono font-semibold text-ink w-7 text-right">{value.toFixed(0)}</span>
    </div>
  )
}

function AllocationRow({ result }: { result: TaskAllocationResult }) {
  const [expanded, setExpanded] = useState(false)
  const riskV = result.risk.risk_level === 'LOW' ? 'safe' : result.risk.risk_level === 'MEDIUM' ? 'warn' : 'danger'
  const scoreColor = result.score >= 70 ? 'text-emerald' : result.score >= 40 ? 'text-amber' : 'text-rose'

  return (
    <>
      <tr className="cursor-pointer" onClick={() => setExpanded(e => !e)}>
        <td><p className="font-semibold text-ink">{result.task_title}</p></td>
        <td>
          <div className="flex items-center gap-2">
            <Avatar name={result.assigned_to_name} photo={localStorage.getItem(`avatar_${result.assigned_to_name}`)} size="sm" />
            <span className="text-[13px] text-ink">{result.assigned_to_name}</span>
          </div>
        </td>
        <td>
          <div className="flex items-center gap-1.5">
            <div className={cn('w-9 h-9 rounded-lg bg-stone flex items-center justify-center font-bold font-mono text-sm', scoreColor)}>
              {result.score.toFixed(0)}
            </div>
          </div>
        </td>
        <td><Badge variant={riskV} dot>{result.risk.risk_level}</Badge></td>
        <td>
          <div className="flex items-center gap-1.5">
            <div className="w-12 h-1.5 bg-stone rounded-full overflow-hidden">
              <div className={cn('h-full rounded-full', result.workload_after > 85 ? 'bg-rose' : result.workload_after > 60 ? 'bg-amber' : 'bg-emerald')}
                style={{ width: `${Math.min(result.workload_after, 100)}%` }} />
            </div>
            <span className="text-xs font-mono text-ink-2">{result.workload_after.toFixed(0)}%</span>
          </div>
        </td>
        <td>{expanded ? <ChevronUp size={14} className="text-ink-3" /> : <ChevronDown size={14} className="text-ink-3" />}</td>
      </tr>
      {expanded && (
        <tr>
          <td colSpan={6} className="bg-stone px-6 py-5 border-b border-border">
            <div className="grid grid-cols-2 gap-8">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-ink-3 mb-3">Score Breakdown</p>
                <div className="space-y-2.5">
                  <ScoreBar label="Skill match" value={result.score_breakdown.skill} max={40} />
                  <ScoreBar label="Workload" value={result.score_breakdown.workload} max={25} />
                  <ScoreBar label="Availability" value={result.score_breakdown.availability} max={20} />
                  <ScoreBar label="Priority" value={result.score_breakdown.priority} max={15} />
                </div>
                <div className="mt-3 pt-3 border-t border-border flex justify-between">
                  <span className="text-xs font-semibold text-ink-2">Total</span>
                  <span className={cn('text-sm font-bold font-mono', scoreColor)}>{result.score.toFixed(1)} / 100</span>
                </div>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-ink-3 mb-3">Risk Analysis</p>
                {result.risk.reasons.length === 0
                  ? <p className="text-sm text-emerald flex items-center gap-1.5"><span>✓</span> No risk factors identified</p>
                  : (
                    <ul className="space-y-2">
                      {result.risk.reasons.map((r, i) => (
                        <li key={i} className="flex items-start gap-2 text-[13px] text-ink-2">
                          <AlertTriangle size={12} className="text-amber mt-0.5 flex-shrink-0" />{r}
                        </li>
                      ))}
                    </ul>
                  )
                }
                <div className="mt-4 pt-3 border-t border-border">
                  <div className="flex items-center gap-2">
                    <Badge variant={riskV} dot>{result.risk.risk_level} RISK</Badge>
                    <span className="text-xs font-mono text-ink-3">{result.risk.risk_score.toFixed(0)}/100</span>
                  </div>
                </div>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

export default function Allocation() {
  const { selectedProject } = useWorkspaceStore()
  const { setAction } = useLayout()
  const [result, setResult] = useState<AllocationRun | null>(null)
  const [running, setRunning] = useState(false)

  const handleAllocate = async () => {
    if (!selectedProject) return
    setRunning(true)
    try {
      const run = await allocationService.allocate(selectedProject.id)
      setResult(run)
      showToast(`${run.assignments.length} task${run.assignments.length !== 1 ? 's' : ''} assigned`)
    } catch (err) { showToast(getErrorMessage(err), 'error') }
    finally { setRunning(false) }
  }

  useLayoutEffect(() => {
    setAction(
      <Button size="sm" icon={<Zap size={13} />} loading={running} onClick={handleAllocate}>
        {result ? 'Re-run Allocation' : 'Run Allocation'}
      </Button>
    )
    return () => setAction(null)
  }, [running, result, selectedProject])

  return (
    <ContextGuard requireProject>
      <div className="page">
        <div className="mb-5">
          <h2 className="text-lg font-bold text-ink">Allocation</h2>
          <p className="text-sm text-ink-3 mt-0.5">See who should take each task — with reasoning</p>
        </div>

        {!result && !running && (
          <div className="card p-16 text-center">
            <div className="w-14 h-14 rounded-2xl bg-violet-muted flex items-center justify-center mx-auto mb-4">
              <Zap size={24} className="text-violet" />
            </div>
            <h3 className="text-sm font-bold text-ink mb-2">No allocation run yet</h3>
            <p className="text-sm text-ink-3 max-w-sm mx-auto mb-6">
              Run allocation to see scored assignments, risk levels, and workload impact for every task.
            </p>
            <Button icon={<Zap size={14} />} onClick={handleAllocate}>Run Allocation</Button>
          </div>
        )}

        {running && (
          <div className="card p-16 text-center">
            <div className="w-14 h-14 rounded-2xl bg-violet-muted flex items-center justify-center mx-auto mb-4 animate-pulse-soft">
              <BarChart2 size={24} className="text-violet" />
            </div>
            <p className="text-sm font-semibold text-ink mb-1">Analysing team capacity…</p>
            <p className="text-sm text-ink-3">Scoring every candidate for every task</p>
          </div>
        )}

        {result && !running && (
          <div className="space-y-4 animate-fade">
            {/* Summary stats */}
            <div className="grid grid-cols-4 gap-3">
              {[
                { label: 'Assigned', v: result.assignments.length, color: 'text-emerald', bg: 'bg-emerald-bg' },
                { label: 'Unassigned', v: result.unassigned_tasks.length, color: result.unassigned_tasks.length > 0 ? 'text-rose' : 'text-ink-3', bg: 'bg-rose-bg' },
                { label: 'Suggestions', v: result.optimization_suggestions.length, color: 'text-amber', bg: 'bg-amber-bg' },
                { label: 'Insights', v: result.system_insights.length, color: 'text-violet', bg: 'bg-violet-muted' },
              ].map(({ label, v, color, bg }) => (
                <div key={label} className="stat text-center">
                  <p className={cn('text-3xl font-bold font-mono', color)}>{v}</p>
                  <p className="text-xs text-ink-3 mt-1">{label}</p>
                </div>
              ))}
            </div>

            {/* Assignments table */}
            <div className="card overflow-hidden">
              <div className="px-5 py-4 border-b border-border">
                <h3 className="text-sm font-bold text-ink">Assignments</h3>
                <p className="text-xs text-ink-3 mt-0.5">Click any row to see score breakdown and risk analysis</p>
              </div>
              {result.assignments.length === 0
                ? <div className="p-12 text-center"><p className="text-sm text-ink-3">No tasks were assigned. Check team capacity and skill coverage.</p></div>
                : (
                  <table className="tbl">
                    <thead><tr><th>Task</th><th>Assigned To</th><th>Score</th><th>Risk</th><th>Load After</th><th className="w-8"></th></tr></thead>
                    <tbody>{result.assignments.map(a => <AllocationRow key={a.task_id} result={a} />)}</tbody>
                  </table>
                )
              }
            </div>

            {/* Suggestions */}
            {result.optimization_suggestions.length > 0 && (
              <div className="card p-5">
                <h3 className="text-sm font-bold text-ink mb-3">Optimization Suggestions</h3>
                <div className="space-y-2">
                  {result.optimization_suggestions.map((s, i) => (
                    <div key={i} className="flex items-start gap-3 p-3.5 rounded-lg bg-amber-bg border border-amber-border">
                      <AlertTriangle size={14} className="text-amber mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-semibold text-ink">{s.suggestion}</p>
                        <p className="text-xs text-ink-3 mt-0.5">{s.reason}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Insights */}
            {result.system_insights.length > 0 && (
              <div className="card p-5">
                <h3 className="text-sm font-bold text-ink mb-3">System Insights</h3>
                <div className="space-y-2">
                  {result.system_insights.map((ins, i) => (
                    <div key={i} className={cn('flex items-start gap-3 p-3.5 rounded-lg border',
                      ins.type === 'SKILL_GAP' ? 'bg-rose-bg border-rose/20' :
                      ins.type === 'DEPENDENCY_RISK' ? 'bg-amber-bg border-amber-border' : 'bg-stone border-border'
                    )}>
                      <Info size={14} className={cn('mt-0.5 flex-shrink-0', ins.type === 'SKILL_GAP' ? 'text-rose' : ins.type === 'DEPENDENCY_RISK' ? 'text-amber' : 'text-ink-3')} />
                      <p className="text-[13px] text-ink">{ins.message}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Unassigned */}
            {result.unassigned_tasks.length > 0 && (
              <div className="card p-5">
                <h3 className="text-sm font-bold text-ink mb-3">Unassigned Tasks</h3>
                <div className="space-y-2">
                  {result.unassigned_tasks.map((t, i) => (
                    <div key={i} className="flex items-center justify-between p-3.5 rounded-lg bg-rose-bg border border-rose/20">
                      <span className="text-sm font-semibold text-ink">{t.title}</span>
                      <span className="text-xs text-ink-3">{t.reason}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </ContextGuard>
  )
}
