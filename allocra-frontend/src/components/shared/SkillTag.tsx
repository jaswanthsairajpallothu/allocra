import { cn } from "@/lib/utils";

interface SkillTagProps {
  name: string;
  level: number;
  className?: string;
}

export function SkillTag({ name, level, className }: SkillTagProps) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-accent text-accent-foreground text-xs", className)}>
      <span>{name}</span>
      <span className="flex gap-0.5">
        {Array.from({ length: 5 }).map((_, i) => (
          <span key={i} className={cn("w-1.5 h-1.5 rounded-full", i < level ? "bg-primary" : "bg-border")} />
        ))}
      </span>
    </span>
  );
}
