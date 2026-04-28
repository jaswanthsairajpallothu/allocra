import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes, useNavigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ClerkProvider } from "@clerk/clerk-react";
import { Toaster as HotToaster } from "react-hot-toast";

import SignInPage from "./pages/SignInPage";
import SignUpPage from "./pages/SignUpPage";
import Onboarding from "./pages/Onboarding";
import Dashboard from "./pages/Dashboard";
import WorkspacePage from "./pages/WorkspacePage";
import ProjectPage from "./pages/ProjectPage";
import ProjectsListPage from "./pages/ProjectsListPage";
import NotificationsPage from "./pages/NotificationsPage";
import SettingsPage from "./pages/SettingsPage";
import BillingPage from "./pages/BillingPage";
import NotFound from "./pages/NotFound";

import { ProtectedRoute } from "./components/ProtectedRoute";
import { AppShell } from "./components/layout/AppShell";
import { UpgradeModal } from "./components/UpgradeModal";
import { useApiAuth } from "./hooks/useApiAuth";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false, staleTime: 30_000 },
  },
});

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

function MissingClerkKey() {
  return (
    <div className="flex min-h-screen items-center justify-center surface-mesh p-6">
      <div className="max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-[var(--shadow-md)]">
        <h1 className="text-2xl font-bold gradient-text">Allocra</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Add your <code className="rounded bg-muted px-1.5 py-0.5">VITE_CLERK_PUBLISHABLE_KEY</code>{" "}
          to <code className="rounded bg-muted px-1.5 py-0.5">.env</code> and restart the
          dev server to enable authentication.
        </p>
        <p className="mt-2 text-xs text-muted-foreground">
          Also set <code className="rounded bg-muted px-1.5 py-0.5">VITE_API_URL</code> to your backend URL.
        </p>
      </div>
    </div>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  useApiAuth();
  return (
    <>
      <UpgradeModal />
      {children}
    </>
  );
}

function ClerkWithRouter({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  return (
    <ClerkProvider
      publishableKey={PUBLISHABLE_KEY}
      routerPush={(to) => navigate(to)}
      routerReplace={(to) => navigate(to, { replace: true })}
    >
      <Shell>{children}</Shell>
    </ClerkProvider>
  );
}

const App = () => {
  if (!PUBLISHABLE_KEY || PUBLISHABLE_KEY === "pk_test_replace_me") {
    return <MissingClerkKey />;
  }
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <HotToaster position="top-right" />
        <BrowserRouter>
          <ClerkWithRouter>
            <Routes>
              {/* Public auth routes */}
              <Route
                path="/sign-in/*"
                element={
                  <ProtectedRoute requireOnboarding={false} publicOnly>
                    <SignInPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/sign-up/*"
                element={
                  <ProtectedRoute requireOnboarding={false} publicOnly>
                    <SignUpPage />
                  </ProtectedRoute>
                }
              />
              <Route path="/signin/*" element={<Navigate to="/sign-in" replace />} />
              <Route path="/signup/*" element={<Navigate to="/sign-up" replace />} />

              {/* Onboarding (auth required, but no onboarding gate) */}
              <Route
                path="/onboarding"
                element={
                  <ProtectedRoute requireOnboarding={false} redirectOnboardedTo="/dashboard">
                    <Onboarding />
                  </ProtectedRoute>
                }
              />

              {/* Authenticated app */}
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <AppShell>
                      <Dashboard />
                    </AppShell>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/workspaces/:id"
                element={
                  <ProtectedRoute>
                    <AppShell>
                      <WorkspacePage />
                    </AppShell>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/workspaces/:workspaceId/projects/:projectId/*"
                element={
                  <ProtectedRoute>
                    <AppShell>
                      <ProjectPage />
                    </AppShell>
                  </ProtectedRoute>
                }
              />
              {/* Legacy flat project URL → projects are now nested under workspaces */}
              <Route
                path="/projects"
                element={
                  <ProtectedRoute>
                    <AppShell>
                      <ProjectsListPage />
                    </AppShell>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/projects/:id"
                element={
                  <ProtectedRoute>
                    <AppShell>
                      <ProjectPage />
                    </AppShell>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/notifications"
                element={
                  <ProtectedRoute>
                    <AppShell>
                      <NotificationsPage />
                    </AppShell>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/settings"
                element={
                  <ProtectedRoute>
                    <AppShell>
                      <SettingsPage />
                    </AppShell>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/billing"
                element={
                  <ProtectedRoute>
                    <AppShell>
                      <BillingPage />
                    </AppShell>
                  </ProtectedRoute>
                }
              />

              {/* Root → dashboard (auth gate handles unauthenticated case) */}
              <Route path="/" element={<Navigate to="/dashboard" replace />} />

              {/* Catch-all */}
              <Route
                path="*"
                element={
                  <ProtectedRoute requireOnboarding={false}>
                    <NotFound />
                  </ProtectedRoute>
                }
              />
            </Routes>
          </ClerkWithRouter>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
