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
import { Loader2, Plus, X } from "lucide-react";
import toast from "react-hot-toast";
import { useSubmitTask } from "@/hooks/useTasks";
import type { Task } from "@/types";

export function SubmitTaskModal({
  open,
  onOpenChange,
  task,
  projectId,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  task: Task | null;
  projectId: string;
}) {
  const [description, setDescription] = useState("");
  const [links, setLinks] = useState<string[]>([""]);
  const [files, setFiles] = useState<string[]>([]);
  const submitTask = useSubmitTask(projectId);

  useEffect(() => {
    if (open) {
      setDescription("");
      setLinks([""]);
      setFiles([]);
    }
  }, [open]);

  const submitting = submitTask.isPending;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!task) return;
    const desc = description.trim();
    if (!desc) {
      toast.error("Please describe what you completed");
      return;
    }
    const cleanedLinks = links.map((l) => l.trim()).filter(Boolean);
    // Validate URLs lightly
    for (const l of cleanedLinks) {
      try {
        new URL(l);
      } catch {
        toast.error(`Invalid link: ${l}`);
        return;
      }
    }
    try {
      await submitTask.mutateAsync({
        id: task.id,
        data: {
          description: desc,
          links: cleanedLinks.length ? cleanedLinks : undefined,
          files: files.length ? files : undefined,
        },
      });
      onOpenChange(false);
    } catch {
      // hook handles toast
    }
  };

  const handleFiles = (fl: FileList | null) => {
    if (!fl) return;
    // Frontend currently has no upload endpoint — store filenames as references
    const names = Array.from(fl).map((f) => f.name);
    setFiles((prev) => [...prev, ...names]);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !submitting && onOpenChange(v)}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Submit work</DialogTitle>
          <DialogDescription>
            {task ? `Submit your work on "${task.title}" for review.` : ""}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="submit-desc">
              Description <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="submit-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Briefly describe what you completed and how to verify it."
              maxLength={2000}
              rows={4}
              autoFocus
              disabled={submitting}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Links (optional)</Label>
            {links.map((link, idx) => (
              <div key={idx} className="flex gap-2">
                <Input
                  value={link}
                  onChange={(e) => {
                    const next = [...links];
                    next[idx] = e.target.value;
                    setLinks(next);
                  }}
                  placeholder="https://github.com/... or https://docs..."
                  disabled={submitting}
                />
                {links.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() =>
                      setLinks(links.filter((_, i) => i !== idx))
                    }
                    disabled={submitting}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setLinks([...links, ""])}
              disabled={submitting}
            >
              <Plus className="mr-1 h-3.5 w-3.5" /> Add link
            </Button>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="submit-files">Files (optional)</Label>
            <Input
              id="submit-files"
              type="file"
              multiple
              onChange={(e) => handleFiles(e.target.files)}
              disabled={submitting}
            />
            {files.length > 0 && (
              <ul className="mt-1 space-y-1 text-xs text-muted-foreground">
                {files.map((f, idx) => (
                  <li key={idx} className="flex items-center justify-between">
                    <span className="truncate">{f}</span>
                    <button
                      type="button"
                      onClick={() =>
                        setFiles(files.filter((_, i) => i !== idx))
                      }
                      className="ml-2 text-muted-foreground hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
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
              {submitting ? "Submitting…" : "Submit for review"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
