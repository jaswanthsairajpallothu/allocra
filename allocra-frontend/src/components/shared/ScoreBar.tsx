import { cn } from "@/lib/utils";

interface ScoreBarProps {
  score: number;
  showLabel?: boolean;
  className?: string;
}

export function ScoreBar({ score, showLabel = true, className }: ScoreBarProps) {
  const color = score >= 75 ? "bg-green-500" : score >= 50 ? "bg-primary" : score >= 25 ? "bg-amber-500" : "bg-red-500";

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="flex-1 h-2 rounded-full bg-accent overflow-hidden">
        <div className={cn("h-full rounded-full transition-all", color)} style={{ width: `${score}%` }} />
      </div>
      {showLabel && <span className="text-xs text-muted-foreground w-8 text-right">{score}</span>}
    </div>
  );
}
