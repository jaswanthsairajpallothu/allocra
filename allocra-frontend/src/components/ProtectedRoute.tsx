import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@clerk/clerk-react";
import { useMe } from "@/hooks/useAuth";

export function ProtectedRoute({
  children,
  requireOnboarding = true,
  publicOnly = false,
  redirectAuthenticatedTo,
  redirectOnboardedTo,
}: {
  children: ReactNode;
  requireOnboarding?: boolean;
  publicOnly?: boolean;
  redirectAuthenticatedTo?: string;
  redirectOnboardedTo?: string;
}) {
  const { isLoaded, isSignedIn } = useAuth();
  const { data: user, isLoading, isError } = useMe(isLoaded && isSignedIn === true);
  const location = useLocation();

  const isSignInRoute =
    location.pathname.startsWith("/sign-in") || location.pathname.startsWith("/sign-up");

  const isOnboardingRoute = location.pathname.startsWith("/onboarding");

  // 1. Wait for Clerk
  if (!isLoaded) {
    return <div className="min-h-screen bg-background" />;
  }

  // 2. Not signed in
  if (!isSignedIn) {
    return isSignInRoute ? <>{children}</> : <Navigate to="/sign-in" replace />;
  }

  // 3. Wait for API
  if (isLoading) {
    return <div className="min-h-screen bg-background" />;
  }

  // 4. API error
  if (isError) {
    return <Navigate to="/sign-in" replace />;
  }

  // 5. Wait for user
  if (user == null) {
    return <div className="min-h-screen bg-background" />;
  }

  // 6. Business logic
  const needsOnboarding = user.onboarding_complete === false;

  // Public routes (signin/signup)
  if (publicOnly) {
    return <Navigate to={needsOnboarding ? "/onboarding" : "/dashboard"} replace />;
  }

  // Onboarding guard
  if (requireOnboarding && needsOnboarding && !isOnboardingRoute) {
    return <Navigate to="/onboarding" replace />;
  }

  // Redirect if already onboarded
  if (redirectOnboardedTo && user.onboarding_complete === true && location.pathname !== redirectOnboardedTo) {
    return <Navigate to={redirectOnboardedTo} replace />;
  }

  // Generic redirect for authenticated users
  if (redirectAuthenticatedTo && location.pathname !== redirectAuthenticatedTo) {
    return <Navigate to={redirectAuthenticatedTo} replace />;
  }

  return <>{children}</>;
}
