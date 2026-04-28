import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth as useClerkAuth } from "@clerk/clerk-react";
import { authApi } from "@/api/endpoints";
import { extractError } from "@/api/helpers";
import type { User } from "@/types";
import toast from "react-hot-toast";

/**
 * Fetch current authenticated user. Single source of truth.
 */
export function useMe(enabled = true) {
  const { isLoaded, isSignedIn } = useClerkAuth();
  return useQuery({
    queryKey: ["auth", "me"],
    queryFn: async (): Promise<User> => {
      const res = await authApi.getMe();
      const data = res.data;
      console.log("auth/me response", data);
      if (!data || typeof data !== "object" || !("id" in data)) {
        throw new Error("Invalid /auth/me response");
      }
      return data;
    },
    enabled: enabled && isLoaded && isSignedIn === true,
    retry: 2,
    staleTime: 30_000,
  });
}

export function useUpdateMe() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (patch: { name?: string; avatar_url?: string; plan_tier?: "FREE" | "PRO" | "TEAM" }) => {
      const res = await authApi.updateMe(patch);
      return res.data;
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["auth", "me"] });
      if (vars.plan_tier) {
        toast.success(`Plan upgraded to ${vars.plan_tier}`);
      } else {
        toast.success("Profile updated");
      }
    },
    onError: (e) => toast.error(extractError(e)),
  });
}

export function useUpdateOnboarding() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { step: number; complete?: boolean }) => {
      const res = await authApi.updateOnboarding(payload);
      return res.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["auth", "me"] }),
    onError: (e) => toast.error(extractError(e)),
  });
}

export function useUpdateNotificationPrefs() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      email_notifications?: boolean;
      in_app_notifications?: boolean;
    }) => {
      const res = await authApi.updateNotificationPrefs(payload);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["auth", "me"] });
      toast.success("Preferences saved");
    },
    onError: (e) => toast.error(extractError(e)),
  });
}
