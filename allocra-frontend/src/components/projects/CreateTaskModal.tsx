import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import { useCreateTask } from "@/hooks/useTasks";
import type { TaskPriority } from "@/types";

type FormState = {
  title: string;
  description: string;
  required_skill: string;
  estimated_hours: number;
  priority: TaskPriority;
};

const INITIAL: FormState = {
  title: "",
  description: "",
  required_skill: "",
  estimated_hours: 1,
  priority: "MEDIUM",
};

export function CreateTaskModal({
  open,
  onOpenChange,
  projectId,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  projectId: string | undefined;
}) {
  const [form, setForm] = useState<FormState>(INITIAL);
  const createTask = useCreateTask(projectId ?? "");

  // Reset form when modal opens fresh
  useEffect(() => {
    if (open) setForm(INITIAL);
  }, [open]);

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!projectId) {
      toast.error("Missing project context");
      return;
    }

    const title = form.title.trim();
    const required_skill = form.required_skill.trim();
    const description = form.description.trim();
    const hours = Number(form.estimated_hours);

    if (!title) {
      toast.error("Title is required");
      return;
    }
    if (!required_skill) {
      toast.error("Required skill cannot be empty");
      return;
    }
    if (!Number.isFinite(hours) || hours <= 0) {
      toast.error("Estimated hours must be greater than 0");
      return;
    }

    try {
      await createTask.mutateAsync({
        project_id: projectId,
        title,
        description: description || undefined,
        required_skill,
        required_level: 1,
        estimated_hours: hours,
        priority: form.priority,
      });
      onOpenChange(false);
      setForm(INITIAL);
    } catch {
      // Error toast handled by hook
    }
  };

  const submitting = createTask.isPending;

  return (
    <Dialog open={open} onOpenChange={(v) => !submitting && onOpenChange(v)}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create task</DialogTitle>
          <DialogDescription>
            Add a new task. Allocra will use these details to assign it to the
            best fit.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="task-title">
              Title <span className="text-destructive">*</span>
            </Label>
            <Input
              id="task-title"
              value={form.title}
              onChange={(e) => update("title", e.target.value)}
              placeholder="e.g. Implement payment webhook"
              maxLength={200}
              autoFocus
              disabled={submitting}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="task-desc">Description</Label>
            <Textarea
              id="task-desc"
              value={form.description}
              onChange={(e) => update("description", e.target.value)}
              placeholder="Add context, links, acceptance criteria…"
              maxLength={2000}
              rows={3}
              disabled={submitting}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="task-skill">
                Required skill <span className="text-destructive">*</span>
              </Label>
              <Input
                id="task-skill"
                value={form.required_skill}
                onChange={(e) => update("required_skill", e.target.value)}
                placeholder="e.g. React"
                maxLength={80}
                disabled={submitting}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="task-hours">
                Estimated hours <span className="text-destructive">*</span>
              </Label>
              <Input
                id="task-hours"
                type="number"
                min={0.5}
                step={0.5}
                value={form.estimated_hours}
                onChange={(e) =>
                  update("estimated_hours", Number(e.target.value))
                }
                disabled={submitting}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="task-priority">Priority</Label>
            <Select
              value={form.priority}
              onValueChange={(v) => update("priority", v as TaskPriority)}
              disabled={submitting}
            >
              <SelectTrigger id="task-priority">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="LOW">Low</SelectItem>
                <SelectItem value="MEDIUM">Medium</SelectItem>
                <SelectItem value="HIGH">High</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting && (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              )}
              {submitting ? "Creating…" : "Create task"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
