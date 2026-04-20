import { useState, useRef, useEffect } from 'react'
import { X, Plus, Search } from 'lucide-react'
import { KNOWN_SKILLS, cn } from '@/lib/utils'
import { SkillEntry } from '@/types'

interface SkillDropdownProps {
  value: SkillEntry[]
  onChange: (skills: SkillEntry[]) => void
}

export default function SkillDropdown({ value, onChange }: SkillDropdownProps) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [editingLevel, setEditingLevel] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const addedNames = new Set(value.map(s => s.skill.toLowerCase()))

  const filtered = query.trim()
    ? KNOWN_SKILLS.filter(s => s.toLowerCase().includes(query.toLowerCase()) && !addedNames.has(s.toLowerCase()))
    : KNOWN_SKILLS.filter(s => !addedNames.has(s.toLowerCase())).slice(0, 8)

  const showCustom = query.trim() && !KNOWN_SKILLS.some(s => s.toLowerCase() === query.toLowerCase()) && !addedNames.has(query.toLowerCase())

  const addSkill = (skillName: string) => {
    onChange([...value, { skill: skillName, level: 3 }])
    setQuery('')
    inputRef.current?.focus()
  }

  const removeSkill = (skillName: string) => {
    onChange(value.filter(s => s.skill !== skillName))
  }

  const updateLevel = (skillName: string, level: number) => {
    onChange(value.map(s => s.skill === skillName ? { ...s, level } : s))
  }

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div ref={containerRef} className="space-y-3">
      {/* Added skills */}
      {value.length > 0 && (
        <div className="space-y-2">
          {value.map(skill => (
            <div key={skill.skill} className="flex items-center gap-3 p-2.5 rounded-lg bg-stone border border-border group">
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm font-medium text-ink">{skill.skill}</span>
                  <button onClick={() => removeSkill(skill.skill)} className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-border-2 text-ink-3 hover:text-rose transition-all">
                    <X size={12} />
                  </button>
                </div>
                {/* Level dots */}
                <div className="flex items-center gap-2">
                  <div className="flex gap-1">
                    {[1,2,3,4,5].map(i => (
                      <button
                        key={i}
                        onClick={() => updateLevel(skill.skill, i)}
                        className={cn(
                          'w-5 h-1.5 rounded-full transition-all hover:scale-110',
                          i <= skill.level ? 'bg-violet' : 'bg-border-2 hover:bg-violet/40'
                        )}
                      />
                    ))}
                  </div>
                  <span className="text-[11px] text-ink-3 font-mono">
                    {['', 'Beginner', 'Basic', 'Intermediate', 'Advanced', 'Expert'][skill.level]}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Search input */}
      <div className="relative">
        <div className="relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-3" />
          <input
            ref={inputRef}
            className="field pl-9"
            placeholder="Search or add a skill…"
            value={query}
            onChange={e => { setQuery(e.target.value); setOpen(true) }}
            onFocus={() => setOpen(true)}
          />
        </div>

        {open && (filtered.length > 0 || showCustom) && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-border rounded-xl shadow-drop z-50 overflow-hidden animate-slide-down">
            <div className="max-h-52 overflow-y-auto">
              {filtered.map(skill => (
                <button
                  key={skill}
                  onClick={() => { addSkill(skill); setOpen(false) }}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-ink hover:bg-stone text-left transition-colors"
                >
                  <Plus size={13} className="text-ink-3 flex-shrink-0" />
                  {skill}
                </button>
              ))}
              {showCustom && (
                <button
                  onClick={() => { addSkill(query.trim()); setOpen(false) }}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-violet hover:bg-violet-muted text-left transition-colors border-t border-border"
                >
                  <Plus size={13} className="flex-shrink-0" />
                  Add &ldquo;{query.trim()}&rdquo; as custom skill
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
