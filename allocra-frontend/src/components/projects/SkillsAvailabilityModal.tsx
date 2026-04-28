import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  useUpdateMySkills,
  useUpdateMyAvailability,
} from "@/hooks/useProjects";
import { Loader2, Plus, X, Sparkles, Clock } from "lucide-react";
import type { Skill } from "@/types";

const SUGGESTED_SKILLS = [
  "React",
  "TypeScript",
  "JavaScript",
  "Python",
  "Node.js",
  "Go",
  "Java",
  "Rust",
  "SQL",
  "PostgreSQL",
  "MongoDB",
  "AWS",
  "Docker",
  "Kubernetes",
  "Figma",
  "UI Design",
  "UX Research",
  "Product Management",
  "Project Management",
  "Marketing",
  "Copywriting",
  "Data Analysis",
  "Machine Learning",
  "DevOps",
  "QA",
  "iOS",
  "Android",
  "Flutter",
  "GraphQL",
  "Tailwind CSS",
];

const LEVEL_LABELS: Record<number, string> = {
  1: "Beginner",
  2: "Novice",
  3: "Intermediate",
  4: "Advanced",
  5: "Expert",
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string | undefined;
  initialSkills?: Skill[];
  initialAvailability?: number;
  /** When true, the modal cannot be dismissed without saving (used after join). */
  blocking?: boolean;
}

export function SkillsAvailabilityModal({
  open,
  onOpenChange,
  projectId,
  initialSkills = [],
  initialAvailability = 0,
  blocking = false,
}: Props) {
  const [skills, setSkills] = useState<Skill[]>(initialSkills);
  const [query, setQuery] = useState("");
  const [hours, setHours] = useState<string>(
    initialAvailability ? String(initialAvailability) : ""
  );

  const updateSkills = useUpdateMySkills(projectId ?? "");
  const updateAvailability = useUpdateMyAvailability(projectId ?? "");

  // Reset state when modal opens with new data
  useEffect(() => {
    if (open) {
      setSkills(initialSkills);
      setHours(initialAvailability ? String(initialAvailability) : "");
      setQuery("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const existingNames = useMemo(
    () => new Set(skills.map((s) => s.name.toLowerCase())),
    [skills]
  );

  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase();
    const pool = SUGGESTED_SKILLS.filter(
      (s) => !existingNames.has(s.toLowerCase())
    );
    if (!q) return pool.slice(0, 8);
    return pool.filter((s) => s.toLowerCase().includes(q)).slice(0, 8);
  }, [query, existingNames]);

  const trimmedQuery = query.trim();
  const canAddCustom =
    trimmedQuery.length > 0 &&
    !existingNames.has(trimmedQuery.toLowerCase()) &&
    !suggestions.some((s) => s.toLowerCase() === trimmedQuery.toLowerCase());

  const addSkill = (name: string) => {
    const clean = name.trim();
    if (!clean || existingNames.has(clean.toLowerCase())) return;
    setSkills((prev) => [...prev, { name: clean, level: 3 }]);
    setQuery("");
  };

  const removeSkill = (name: string) => {
    setSkills((prev) => prev.filter((s) => s.name !== name));
  };

  const setLevel = (name: string, level: number) => {
    setSkills((prev) =>
      prev.map((s) => (s.name === name ? { ...s, level } : s))
    );
  };

  const hoursNumber = Number(hours);
  const validHours =
    hours !== "" &&
    Number.isFinite(hoursNumber) &&
    hoursNumber > 0 &&
    hoursNumber <= 168;
  const canSave = projectId && skills.length > 0 && validHours;

  const handleSave = async () => {
    if (!canSave) return;
    try {
      await updateSkills.mutateAsync(skills);
      await updateAvailability.mutateAsync(hoursNumber);
      onOpenChange(false);
    } catch {
      // toasts handled in hooks
    }
  };

  const isSaving = updateSkills.isPending || updateAvailability.isPending;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next && blocking && !canSave) return;
        onOpenChange(next);
      }}
    >
      <DialogContent
        className="max-w-xl"
        onInteractOutside={(e) => {
          if (blocking) e.preventDefault();
        }}
        onEscapeKeyDown={(e) => {
          if (blocking) e.preventDefault();
        }}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Set your skills & availability
          </DialogTitle>
          <DialogDescription>
            Allocra uses this to assign tasks fairly. You can update it anytime.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {/* Skills */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Skills</Label>
            <div className="relative">
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && canAddCustom) {
                    e.preventDefault();
                    addSkill(trimmedQuery);
                  }
                }}
                placeholder="Search or add a skill (e.g. React, Figma)"
              />
            </div>

            {(suggestions.length > 0 || canAddCustom) && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {canAddCustom && (
                  <button
                    type="button"
                    onClick={() => addSkill(trimmedQuery)}
                    className="inline-flex items-center gap-1 rounded-full border border-primary/40 bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary/20"
                  >
                    <Plus className="h-3 w-3" />
                    Add "{trimmedQuery}"
                  </button>
                )}
                {suggestions.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => addSkill(s)}
                    className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
                  >
                    <Plus className="h-3 w-3" />
                    {s}
                  </button>
                ))}
              </div>
            )}

            {skills.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border bg-muted/30 px-4 py-6 text-center text-xs text-muted-foreground">
                Add at least one skill to enable allocation.
              </div>
            ) : (
              <ul className="space-y-2 pt-1">
                {skills.map((s) => (
                  <li
                    key={s.name}
                    className="flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">
                        {s.name}
                      </div>
                      <div className="mt-1 flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((lvl) => (
                          <button
                            key={lvl}
                            type="button"
                            onClick={() => setLevel(s.name, lvl)}
                            aria-label={`Set ${s.name} to ${LEVEL_LABELS[lvl]}`}
                            className={`h-1.5 w-6 rounded-full transition-colors ${
                              lvl <= s.level
                                ? "bg-primary"
                                : "bg-muted hover:bg-muted-foreground/30"
                            }`}
                          />
                        ))}
                        <span className="ml-2 text-[11px] text-muted-foreground">
                          {LEVEL_LABELS[s.level]}
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeSkill(s.name)}
                      aria-label={`Remove ${s.name}`}
                      className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Availability */}
          <div className="space-y-2">
            <Label
              htmlFor="hours"
              className="flex items-center gap-1.5 text-sm font-medium"
            >
              <Clock className="h-3.5 w-3.5 text-muted-foreground" />
              Available hours per week
            </Label>
            <Input
              id="hours"
              type="number"
              min={1}
              max={168}
              value={hours}
              onChange={(e) => setHours(e.target.value)}
              placeholder="e.g. 30"
            />
            {hours !== "" && !validHours && (
              <p className="text-xs text-destructive">
                Enter a value between 1 and 168.
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between pt-2">
          <p className="text-xs text-muted-foreground">
            {skills.length > 0 && (
              <Badge variant="secondary" className="mr-2 font-mono text-[10px]">
                {skills.length}
              </Badge>
            )}
            {skills.length === 1 ? "1 skill" : `${skills.length} skills`}
          </p>
          <div className="flex gap-2">
            {!blocking && (
              <Button
                variant="ghost"
                onClick={() => onOpenChange(false)}
                disabled={isSaving}
              >
                Cancel
              </Button>
            )}
            <Button onClick={handleSave} disabled={!canSave || isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  Saving
                </>
              ) : (
                "Save"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
