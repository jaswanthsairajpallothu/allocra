import { useAuth } from "@clerk/clerk-react";
import { useEffect, useRef } from "react";
import { setupInterceptors } from "@/lib/api";

export function useApiAuth() {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    setupInterceptors(async () => {
      try {
        return await getToken();
      } catch {
        return null;
      }
    });
  }, [getToken]);

  return { isLoaded, isSignedIn };
}
