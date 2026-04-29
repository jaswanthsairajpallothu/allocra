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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, Star, ExternalLink, FileIcon } from "lucide-react";
import toast from "react-hot-toast";
import { useReviewTask } from "@/hooks/useTasks";
import type { Task } from "@/types";

export function ReviewTaskModal({
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
  const [feedback, setFeedback] = useState("");
  const [rating, setRating] = useState<number>(5);
  const reviewTask = useReviewTask(projectId);

  useEffect(() => {
    if (open) {
      setFeedback("");
      setRating(5);
    }
  }, [open]);

  const submitting = reviewTask.isPending;

  const handleDecision = async (decision: "APPROVED" | "REJECTED") => {
    if (!task) return;
    if (decision === "REJECTED" && !feedback.trim()) {
      toast.error("Please provide feedback when rejecting");
      return;
    }
    try {
      await reviewTask.mutateAsync({
        id: task.id,
        data: {
          decision,
          feedback: feedback.trim() || undefined,
          ...(decision === "APPROVED" ? { rating } : {}),
        },
      });
      onOpenChange(false);
    } catch {
      // hook handles toast
    }
  };

  const submission = task?.submission ?? null;

  return (
    <Dialog open={open} onOpenChange={(v) => !submitting && onOpenChange(v)}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Review submission</DialogTitle>
          <DialogDescription>
            {task ? `Review work submitted for "${task.title}".` : ""}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <section className="rounded-lg border border-border bg-muted/30 p-4">
            <div className="text-xs uppercase tracking-widest text-muted-foreground">
              Submission
            </div>
            {submission?.submitted_by_name && (
              <p className="mt-1 text-xs text-muted-foreground">
                by {submission.submitted_by_name}
              </p>
            )}
            <p className="mt-2 whitespace-pre-wrap text-sm">
              {submission?.description || (
                <span className="italic text-muted-foreground">
                  No description provided.
                </span>
              )}
            </p>
            {submission?.links && submission.links.length > 0 && (
              <div className="mt-3 space-y-1">
                <div className="text-xs font-medium">Links</div>
                <ul className="space-y-1">
                  {submission.links.map((l, i) => (
                    <li key={i} className="flex items-center gap-1.5 text-xs">
                      <ExternalLink className="h-3 w-3 text-muted-foreground" />
                      <a
                        href={l}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="truncate text-primary hover:underline"
                      >
                        {l}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {submission?.files && submission.files.length > 0 && (
              <div className="mt-3 space-y-1">
                <div className="text-xs font-medium">Files</div>
                <ul className="space-y-1">
                  {submission.files.map((f, i) => (
                    <li key={i} className="flex items-center gap-1.5 text-xs">
                      <FileIcon className="h-3 w-3 text-muted-foreground" />
                      <span className="truncate">{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>

          <div className="space-y-1.5">
            <Label>Rating (for approval)</Label>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setRating(n)}
                  disabled={submitting}
                  className="rounded p-0.5 transition-colors hover:bg-accent"
                  aria-label={`${n} star${n === 1 ? "" : "s"}`}
                >
                  <Star
                    className={`h-5 w-5 ${
                      n <= rating
                        ? "fill-primary text-primary"
                        : "text-muted-foreground"
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="review-feedback">
              Feedback{" "}
              <span className="text-xs text-muted-foreground">
                (required when rejecting)
              </span>
            </Label>
            <Textarea
              id="review-feedback"
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Share what worked well or what to improve."
              maxLength={2000}
              rows={3}
              disabled={submitting}
            />
          </div>
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
          <Button
            type="button"
            variant="destructive"
            onClick={() => handleDecision("REJECTED")}
            disabled={submitting}
          >
            {submitting && (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            )}
            Reject
          </Button>
          <Button
            type="button"
            onClick={() => handleDecision("APPROVED")}
            disabled={submitting}
          >
            {submitting && (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            )}
            Approve
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
