import { cn } from "@/lib/utils";

interface PlanBadgeProps {
  plan: string;
  className?: string;
}

export function PlanBadge({ plan, className }: PlanBadgeProps) {
  const styles = {
    FREE: "bg-muted text-muted-foreground border border-border",
    PRO: "bg-primary/20 text-primary border border-primary/30",
    TEAM: "bg-secondary/20 text-secondary border border-secondary/30",
  };

  return (
    <span className={cn("inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold uppercase tracking-wide", styles[plan as keyof typeof styles] ?? styles.FREE, className)}>
      {plan}
    </span>
  );
}
