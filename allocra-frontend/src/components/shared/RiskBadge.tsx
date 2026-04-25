import { cn } from "@/lib/utils";

interface RiskBadgeProps {
  level: string;
  className?: string;
}

export function RiskBadge({ level, className }: RiskBadgeProps) {
  const styles = {
    LOW: "bg-green-500/20 text-green-400 border border-green-500/30",
    MEDIUM: "bg-amber-500/20 text-amber-400 border border-amber-500/30",
    HIGH: "bg-red-500/20 text-red-400 border border-red-500/30",
  };

  return (
    <span className={cn("inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold", styles[level as keyof typeof styles] ?? styles.LOW, className)}>
      {level}
    </span>
  );
}
