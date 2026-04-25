import { createRoot } from "react-dom/client";
import { ClerkProvider } from "@clerk/clerk-react";
import App from "./App";
import "./index.css";
import { Zap } from "lucide-react";

const publishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

function MissingKeyScreen() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 gap-6">
      <div className="flex flex-col items-center gap-3">
        <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center shadow-lg">
          <Zap className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-foreground">Allocra</h1>
        <p className="text-sm text-muted-foreground">AI-powered team workload allocation</p>
      </div>
      <div className="max-w-md w-full bg-card border border-border rounded-2xl p-6 space-y-4">
        <h2 className="text-lg font-semibold text-foreground">Clerk configuration required</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Add your Clerk publishable key to a <code className="bg-accent px-1.5 py-0.5 rounded text-primary text-xs">.env</code> file in the project root to enable authentication:
        </p>
        <pre className="bg-accent rounded-xl p-4 text-xs text-foreground font-mono overflow-x-auto">
{`VITE_CLERK_PUBLISHABLE_KEY=pk_test_...`}
        </pre>
        <p className="text-xs text-muted-foreground">
          Get your key from{" "}
          <a href="https://dashboard.clerk.com" target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-2">
            dashboard.clerk.com
          </a>
        </p>
      </div>
    </div>
  );
}

const root = createRoot(document.getElementById("root")!);

if (!publishableKey) {
  root.render(<MissingKeyScreen />);
} else {
  root.render(
    <ClerkProvider publishableKey={publishableKey}>
      <App />
    </ClerkProvider>
  );
}
