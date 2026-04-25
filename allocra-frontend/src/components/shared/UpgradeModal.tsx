import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Zap } from "lucide-react";
import { useLocation } from "wouter";

interface UpgradeModalProps {
  open: boolean;
  plan: string;
  onClose: () => void;
}

export default function UpgradeModal({ open, plan, onClose }: UpgradeModalProps) {
  const [, setLocation] = useLocation();

  const handleUpgrade = () => {
    onClose();
    setLocation("/billing");
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-card border-border max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-primary" />
            Upgrade Required
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            This feature requires the <span className="text-foreground font-semibold">{plan}</span> plan.
          </p>
          <div className="bg-accent rounded-lg p-3 text-sm text-muted-foreground">
            Upgrade to unlock allocation history, project chat, analytics, and more.
          </div>
        </div>
        <div className="flex gap-2 mt-2">
          <Button variant="ghost" onClick={onClose} className="flex-1">Maybe later</Button>
          <Button onClick={handleUpgrade} className="flex-1" data-testid="button-upgrade">
            Upgrade to {plan}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
