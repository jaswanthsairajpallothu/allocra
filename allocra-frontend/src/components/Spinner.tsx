import { cn } from "@/lib/utils";

interface SpinnerProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

export default function Spinner({ className, size = "md" }: SpinnerProps) {
  const sizes = {
    sm: "w-4 h-4 border-2",
    md: "w-6 h-6 border-2",
    lg: "w-8 h-8 border-2",
  };
  return (
    <div
      className={cn(
        "rounded-full border-primary/20 border-t-primary animate-spin",
        sizes[size],
        className
      )}
    />
  );
}