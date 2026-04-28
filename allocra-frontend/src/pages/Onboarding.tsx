import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMe, useUpdateOnboarding } from "@/hooks/useAuth";
import { useCreateWorkspace, useJoinWorkspace } from "@/hooks/useWorkspaces";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Sparkles, ArrowRight, Check, Building2, Users } from "lucide-react";
import toast from "react-hot-toast";

type Step = 0 | 1 | 2;
type Mode = "create" | "join" | null;

export default function Onboarding() {
  const navigate = useNavigate();
  const { data: me } = useMe();
  const updateOnboarding = useUpdateOnboarding();
  const createWs = useCreateWorkspace();
  const joinWs = useJoinWorkspace();

  const [step, setStep] = useState<Step>(0);
  const [mode, setMode] = useState<Mode>(null);
  const [wsName, setWsName] = useState("");
  const [joinCode, setJoinCode] = useState("");

  const handleCreate = async () => {
    if (!wsName.trim()) return toast.error("Workspace name required");
    try {
      await createWs.mutateAsync({ name: wsName.trim() });
      setStep(2);
    } catch {
      toast.error("Could not create workspace");
    }
  };

  const handleJoin = async () => {
    if (!joinCode.trim()) return toast.error("Join code required");
    try {
      await joinWs.mutateAsync({ join_code: joinCode.trim() });
      setStep(2);
    } catch {
      toast.error("Invalid join code");
    }
  };

  const finish = async () => {
    try {
      await updateOnboarding.mutateAsync({ step: 3, complete: true });
      navigate("/dashboard", { replace: true });
    } catch {
      toast.error("Could not complete onboarding");
    }
  };

  return (
    <div className="min-h-screen surface-mesh">
      <div className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center px-4 py-12">
        <div className="mb-10 flex items-center gap-2">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className={`h-1.5 w-10 rounded-full transition-colors ${
                i <= step ? "bg-primary" : "bg-muted"
              }`}
            />
          ))}
        </div>

        <Card className="w-full overflow-hidden border-border/60 p-8 shadow-[var(--shadow-lg)] animate-in-up">
          {step === 0 && (
            <div className="text-center">
              <div
                className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl text-primary-foreground"
                style={{ background: "var(--gradient-primary)" }}
              >
                <Sparkles className="h-7 w-7" />
              </div>
              <h1 className="text-3xl font-bold">Welcome to Allocra</h1>
              <p className="mt-2 text-muted-foreground">
                Your AI workload co-pilot. Let's get you set up.
              </p>
              {me?.display_id && (
                <div className="mx-auto mt-6 inline-flex items-center gap-2 rounded-full bg-accent px-4 py-2 text-sm text-accent-foreground">
                  <span className="text-muted-foreground">Your ID:</span>
                  <span className="font-mono font-medium">{me.display_id}</span>
                </div>
              )}
              <Button className="mt-8 w-full sm:w-auto" onClick={() => setStep(1)}>
                Continue <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          )}

          {step === 1 && (
            <div>
              <h2 className="text-2xl font-bold">Workspace</h2>
              <p className="mt-1 text-muted-foreground">
                Create a new workspace or join an existing one.
              </p>

              {!mode && (
                <div className="mt-8 grid gap-4 md:grid-cols-2">
                  <button
                    onClick={() => setMode("create")}
                    className="group rounded-2xl border border-border bg-card p-6 text-left transition-all hover:border-primary hover:shadow-[var(--shadow-md)]"
                  >
                    <Building2 className="mb-3 h-6 w-6 text-primary" />
                    <div className="font-semibold">Create workspace</div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Start fresh and invite your team.
                    </p>
                  </button>
                  <button
                    onClick={() => setMode("join")}
                    className="group rounded-2xl border border-border bg-card p-6 text-left transition-all hover:border-primary hover:shadow-[var(--shadow-md)]"
                  >
                    <Users className="mb-3 h-6 w-6 text-primary" />
                    <div className="font-semibold">Join workspace</div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Use a join code from a teammate.
                    </p>
                  </button>
                </div>
              )}

              {mode === "create" && (
                <div className="mt-8 space-y-4">
                  <Input
                    placeholder="Workspace name (e.g. Acme Inc)"
                    value={wsName}
                    onChange={(e) => setWsName(e.target.value)}
                  />
                  <div className="flex gap-2">
                    <Button variant="ghost" onClick={() => setMode(null)}>
                      Back
                    </Button>
                    <Button
                      className="ml-auto"
                      onClick={handleCreate}
                      disabled={createWs.isPending}
                    >
                      {createWs.isPending ? "Creating..." : "Create workspace"}
                    </Button>
                  </div>
                </div>
              )}

              {mode === "join" && (
                <div className="mt-8 space-y-4">
                  <Input
                    placeholder="Enter join code"
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value)}
                  />
                  <div className="flex gap-2">
                    <Button variant="ghost" onClick={() => setMode(null)}>
                      Back
                    </Button>
                    <Button
                      className="ml-auto"
                      onClick={handleJoin}
                      disabled={joinWs.isPending}
                    >
                      {joinWs.isPending ? "Joining..." : "Join workspace"}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="text-center">
              <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-success/15 text-success">
                <Check className="h-7 w-7" />
              </div>
              <h2 className="text-2xl font-bold">You're all set</h2>
              <p className="mt-2 text-muted-foreground">
                Let's get you to your dashboard.
              </p>
              <Button
                className="mt-8"
                onClick={finish}
                disabled={updateOnboarding.isPending}
              >
                {updateOnboarding.isPending ? "Finishing..." : "Go to dashboard"}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
