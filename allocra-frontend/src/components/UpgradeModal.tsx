import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Check, Sparkles } from "lucide-react";
import { useUIStore } from "@/stores/ui";
import { useNavigate } from "react-router-dom";
import type { PlanRequiredError } from "@/types/api";

export function UpgradeModal() {
  const { upgradeOpen, upgradeContext, openUpgrade, closeUpgrade } =
    useUIStore();
  const navigate = useNavigate();

  // Listen for plan_required dispatch
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<PlanRequiredError>).detail;
      openUpgrade(detail);
    };
    window.addEventListener("allocra:plan_required", handler);
    return () => window.removeEventListener("allocra:plan_required", handler);
  }, [openUpgrade]);

  return (
    <Dialog open={upgradeOpen} onOpenChange={(o) => !o && closeUpgrade()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="mb-2 inline-flex w-fit items-center gap-2 rounded-full bg-accent px-3 py-1 text-xs font-medium text-accent-foreground">
            <Sparkles className="h-3.5 w-3.5" />
            Upgrade required
          </div>
          <DialogTitle className="text-2xl">
            Unlock more with Allocra Pro
          </DialogTitle>
          <DialogDescription>
            {upgradeContext?.message ??
              "This feature requires a higher plan. Upgrade to keep your team moving."}
          </DialogDescription>
        </DialogHeader>

        <ul className="my-4 space-y-2 text-sm">
          {[
            "Unlimited workspaces & projects",
            "AI workload allocation",
            "Team chat & analytics",
            "Priority support",
          ].map((f) => (
            <li key={f} className="flex items-center gap-2">
              <Check className="h-4 w-4 text-success" />
              {f}
            </li>
          ))}
        </ul>

        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button variant="ghost" onClick={closeUpgrade}>
            Not now
          </Button>
          <Button
            onClick={() => {
              closeUpgrade();
              navigate("/billing");
            }}
          >
            View plans
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
