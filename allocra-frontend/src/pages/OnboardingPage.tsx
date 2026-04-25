import { useState } from "react";
import { useLocation, Redirect } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/api/client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CopyButton } from "@/components/shared/CopyButton";
import { Zap, Building2, LogIn, Check, PartyPopper } from "lucide-react";
import { toast } from "@/hooks/use-toast";

export default function OnboardingPage() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const { data: me, isLoading } = useQuery({
    queryKey: ["me"],
    queryFn: async () => (await api.get("/auth/me")).data,
  });

  const updateOnboarding = useMutation({
    mutationFn: (payload: { step: number; complete?: boolean }) =>
      api.post("/auth/onboarding-complete", payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["me"] });
    },
  });

  const createWorkspace = useMutation({
    mutationFn: (name: string) =>
      api.post("/workspaces", { name }),
  });

  const joinWorkspace = useMutation({
    mutationFn: (code: string) =>
      api.post("/workspaces/join", { code }),
  });

  const [workspaceName, setWorkspaceName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [mode, setMode] = useState<"create" | "join" | null>(null);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (me?.onboarding_complete) {
    return <Redirect to="/dashboard" />;
  }

  const step = me?.onboarding_step ?? 1;

  const goToStep = async (s: number, complete?: boolean) => {
    await updateOnboarding.mutateAsync({ step: s, complete });
  };

  const handleCreateWorkspace = async () => {
    if (!workspaceName.trim()) return;

    await createWorkspace.mutateAsync(workspaceName);
    await goToStep(3);
  };

  const handleJoinWorkspace = async () => {
    if (!joinCode.trim()) return;

    try {
      await joinWorkspace.mutateAsync(joinCode.toUpperCase());
      await goToStep(3);
    } catch {
      toast({
        title: "Invalid join code",
        description: "No workspace found with that code.",
        variant: "destructive",
      });
    }
  };

  const handleFinish = async () => {
    await goToStep(3, true);
    setLocation("/dashboard");
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">

        {/* Header */}
        <div className="flex items-center gap-2 mb-8 justify-center">
          <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-lg">Allocra</span>
        </div>

        {/* Steps */}
        <div className="flex items-center gap-2 mb-8 justify-center">
          {[1, 2, 3].map(s => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                s <= step ? "bg-primary text-white" : "bg-accent"
              }`}>
                {s < step ? <Check className="w-4 h-4" /> : s}
              </div>
              {s < 3 && <div className="w-12 h-0.5 bg-border" />}
            </div>
          ))}
        </div>

        <div className="bg-card border rounded-2xl p-6">

          {/* STEP 1 */}
          {step === 1 && (
            <div className="text-center space-y-4">
              <h2 className="text-xl font-bold">Welcome to Allocra</h2>

              <div className="bg-accent rounded-xl p-4 flex items-center justify-between">
                <span className="font-mono font-bold text-primary">
                  {me?.display_id}
                </span>
                <CopyButton text={me?.display_id ?? ""} />
              </div>

              <Button className="w-full" onClick={() => goToStep(2)}>
                Continue
              </Button>
            </div>
          )}

          {/* STEP 2 */}
          {step === 2 && (
            <div className="space-y-4">

              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => setMode("create")} className="p-4 border rounded-xl">
                  <Building2 className="w-6 h-6 mb-2" />
                  Create
                </button>

                <button onClick={() => setMode("join")} className="p-4 border rounded-xl">
                  <LogIn className="w-6 h-6 mb-2" />
                  Join
                </button>
              </div>

              {mode === "create" && (
                <>
                  <Input
                    placeholder="Workspace name"
                    value={workspaceName}
                    onChange={(e) => setWorkspaceName(e.target.value)}
                  />
                  <Button onClick={handleCreateWorkspace}>
                    Create Workspace
                  </Button>
                </>
              )}

              {mode === "join" && (
                <>
                  <Input
                    placeholder="Join code"
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value)}
                  />
                  <Button onClick={handleJoinWorkspace}>
                    Join Workspace
                  </Button>
                </>
              )}

            </div>
          )}

          {/* STEP 3 */}
          {step === 3 && (
            <div className="text-center space-y-4">
              <PartyPopper className="mx-auto w-8 h-8" />
              <h2 className="text-xl font-bold">You're all set!</h2>
              <Button onClick={handleFinish}>
                Go to Dashboard
              </Button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}