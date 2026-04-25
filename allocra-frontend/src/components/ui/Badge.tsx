import * as React from "react";

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "outline";
}

export function Badge({ className = "", variant = "default", ...props }: BadgeProps) {
  const base = "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium";

  const styles =
    variant === "outline"
      ? "border border-border text-foreground"
      : "bg-primary text-white";

  return (
    <span className={`${base} ${styles} ${className}`} {...props} />
  );
}