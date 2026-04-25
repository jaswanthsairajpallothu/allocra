import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/api/client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PlanBadge } from "@/components/shared/PlanBadge";
import { toast } from "@/hooks/use-toast";

export default function SettingsPage() {
  const queryClient = useQueryClient();

  const { data: me, isLoading } = useQuery({
    queryKey: ["me"],
    queryFn: async () => (await api.get("/auth/me")).data,
  });

  const updateMe = useMutation({
    mutationFn: (data: { name: string }) =>
      api.patch("/auth/me", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["me"] });
    },
  });

  const [name, setName] = useState("");

  useEffect(() => {
    if (me?.name) setName(me.name);
  }, [me]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const handleUpdateProfile = async () => {
    if (!name.trim()) return;

    await updateMe.mutateAsync({ name: name.trim() });

    toast({ title: "Profile updated!" });
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Settings</h1>

      <div className="flex items-center gap-4">
        <Avatar>
          <AvatarImage src={me?.avatar_url} />
          <AvatarFallback>{me?.name?.[0]}</AvatarFallback>
        </Avatar>

        <div>
          <p className="font-medium">{me?.name}</p>
          <PlanBadge plan={me?.plan_tier} />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Name</Label>
        <Input value={name} onChange={(e) => setName(e.target.value)} />
      </div>

      <Button onClick={handleUpdateProfile} disabled={updateMe.isPending}>
        Save Changes
      </Button>
    </div>
  );
}