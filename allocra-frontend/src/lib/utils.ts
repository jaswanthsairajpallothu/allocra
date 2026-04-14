import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getInitials(name: string): string {
  if (!name) return "?";
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function getAvatarColor(name: string): string {
  if (!name) return "bg-gray-500";
  const colors = [
    "bg-blue-500",
    "bg-purple-500",
    "bg-emerald-500",
    "bg-amber-500",
    "bg-rose-500",
    "bg-cyan-500",
    "bg-indigo-500",
    "bg-pink-500",
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

export function getPriorityLabel(priority: number): string {
  if (priority >= 4) return "Critical";
  if (priority >= 3) return "High";
  if (priority >= 2) return "Medium";
  return "Low";
}

export function getPriorityColor(priority: number): string {
  if (priority >= 4) return "bg-red-500/20 text-red-400 border border-red-500/30";
  if (priority >= 3) return "bg-orange-500/20 text-orange-400 border border-orange-500/30";
  if (priority >= 2) return "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30";
  return "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30";
}

export function getDifficultyColor(difficulty: number): string {
  if (difficulty >= 8) return "bg-red-500/20 text-red-400";
  if (difficulty >= 5) return "bg-yellow-500/20 text-yellow-400";
  return "bg-emerald-500/20 text-emerald-400";
}
