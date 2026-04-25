import { cn } from "@/lib/utils";

interface LoadBarProps {
  percent: number;
  showLabel?: boolean;
  className?: string;
}

export function LoadBar({ percent, showLabel = false, className }: LoadBarProps) {
  const color = percent >= 85 ? "bg-red-500" : percent >= 60 ? "bg-amber-500" : "bg-green-500";
  const trackColor = percent >= 85 ? "bg-red-500/20" : percent >= 60 ? "bg-amber-500/20" : "bg-green-500/20";

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className={cn("flex-1 h-1.5 rounded-full overflow-hidden", trackColor)}>
        <div className={cn("h-full rounded-full transition-all", color)} style={{ width: `${Math.min(100, percent)}%` }} />
      </div>
      {showLabel && <span className="text-xs text-muted-foreground w-9 text-right">{percent}%</span>}
    </div>
  );
}
