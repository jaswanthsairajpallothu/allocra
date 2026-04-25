import { Switch, Route, Router as WouterRouter, Redirect, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SignedIn, SignedOut, useAuth, useUser } from "@clerk/clerk-react";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useEffect } from "react";
import { setupInterceptors } from "@/api/client";
import { useUiStore } from "@/stores/ui";
import SignInPage from "@/pages/SignInPage";
import SignUpPage from "@/pages/SignUpPage";
import OnboardingPage from "@/pages/OnboardingPage";
import DashboardPage from "@/pages/DashboardPage";
import WorkspacePage from "@/pages/WorkspacePage";
import ProjectPage from "@/pages/ProjectPage";
import NotificationsPage from "@/pages/NotificationsPage";
import SettingsPage from "@/pages/SettingsPage";
import BillingPage from "@/pages/BillingPage";
import AppLayout from "@/components/layout/AppLayout";
import UpgradeModal from "@/components/shared/UpgradeModal";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30000,
    },
  },
});

function AuthInterceptorSetup() {
  const { getToken } = useAuth();
  useEffect(() => {
    setupInterceptors(() => getToken());
  }, [getToken]);
  return null;
}

function RootRedirect() {
  const { isSignedIn, isLoaded } = useAuth();
  if (!isLoaded) return null;
  if (isSignedIn) return <Redirect to="/dashboard" />;
  return <Redirect to="/sign-in" />;
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SignedIn>
        <AppLayout>{children}</AppLayout>
      </SignedIn>
      <SignedOut>
        <Redirect to="/sign-in" />
      </SignedOut>
    </>
  );
}

function Router() {
  const { openUpgradeModal, closeUpgradeModal, upgradeModalOpen, upgradeModalPlan } = useUiStore();

  useEffect(() => {
    const handler = (e: Event) => {
      const ce = e as CustomEvent;
      openUpgradeModal(ce.detail?.plan ?? "PRO");
    };
    window.addEventListener("allocra:plan_required", handler);
    return () => window.removeEventListener("allocra:plan_required", handler);
  }, [openUpgradeModal]);

  return (
    <>
      <Switch>
        <Route path="/" component={RootRedirect} />
        <Route path="/sign-in">
          <SignInPage />
        </Route>
        <Route path="/sign-in/sso-callback">
          <SignInPage />
        </Route>
        <Route path="/sign-up" component={SignUpPage} />
        <Route path="/onboarding" component={OnboardingPage} />
        <Route path="/dashboard">
          <ProtectedRoute><DashboardPage /></ProtectedRoute>
        </Route>
        <Route path="/workspaces/:workspaceId">
          <ProtectedRoute><WorkspacePage /></ProtectedRoute>
        </Route>
        <Route path="/workspaces/:workspaceId/projects/:projectId">
          <ProtectedRoute><ProjectPage /></ProtectedRoute>
        </Route>
        <Route path="/notifications">
          <ProtectedRoute><NotificationsPage /></ProtectedRoute>
        </Route>
        <Route path="/settings">
          <ProtectedRoute><SettingsPage /></ProtectedRoute>
        </Route>
        <Route path="/billing">
          <ProtectedRoute><BillingPage /></ProtectedRoute>
        </Route>
        <Route component={NotFound} />
      </Switch>
      <UpgradeModal open={upgradeModalOpen} plan={upgradeModalPlan} onClose={closeUpgradeModal} />
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL?.replace(/\/$/, "") ?? ""}>
          <AuthInterceptorSetup />
          <Router />
          <Toaster />
        </WouterRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;


