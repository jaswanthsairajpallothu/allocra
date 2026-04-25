import { SignIn } from "@clerk/clerk-react";
import { Zap } from "lucide-react";

export default function SignInPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="mb-8 flex flex-col items-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center shadow-lg">
          <Zap className="w-7 h-7 text-white" />
        </div>
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground">Allocra</h1>
          <p className="text-sm text-muted-foreground mt-1">AI-powered team workload allocation</p>
        </div>
      </div>
      <SignIn
        routing="path"
        path="/sign-in"
        signUpUrl="/sign-up"
        forceRedirectUrl="/dashboard"
        appearance={{
          baseTheme: undefined,
          variables: {
            colorBackground: "#161828",
            colorInputBackground: "#1E2035",
            colorInputText: "#F1F5F9",
            colorText: "#F1F5F9",
            colorPrimary: "#5B6CFF",
            colorTextSecondary: "#94A3B8",
            borderRadius: "12px",
          },
        }}
      />
    </div>
  );
}
