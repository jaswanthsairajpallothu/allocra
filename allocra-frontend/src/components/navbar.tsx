import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";

const navItems = [
  { label: "Dashboard", path: "/" },
  { label: "Team", path: "/team" },
  { label: "Tasks", path: "/tasks" },
  { label: "Allocation", path: "/allocation" },
];

export default function Navbar() {
  const [location] = useLocation();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-background/80 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/">
            <div className="flex items-center gap-3 cursor-pointer group">
              <div className="relative">
                <div className="w-9 h-9 rounded-lg bg-primary/20 border border-primary/30 flex items-center justify-center">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path d="M12 2L2 7v10l10 5 10-5V7L12 2z" stroke="hsl(199 89% 48%)" strokeWidth="1.5" strokeLinejoin="round"/>
                    <path d="M12 2v20M2 7l10 5 10-5" stroke="hsl(199 89% 48%)" strokeWidth="1.5" strokeLinejoin="round"/>
                    <circle cx="12" cy="12" r="2" fill="hsl(199 89% 48%)"/>
                    <circle cx="5" cy="9" r="1.5" fill="hsl(199 89% 48% / 0.6)"/>
                    <circle cx="19" cy="9" r="1.5" fill="hsl(199 89% 48% / 0.6)"/>
                    <circle cx="5" cy="16" r="1.5" fill="hsl(199 89% 48% / 0.6)"/>
                    <circle cx="19" cy="16" r="1.5" fill="hsl(199 89% 48% / 0.6)"/>
                    <circle cx="12" cy="19" r="1.5" fill="hsl(199 89% 48% / 0.6)"/>
                  </svg>
                </div>
                <div className="absolute inset-0 rounded-lg bg-primary/10 blur-sm group-hover:bg-primary/20 transition-all" />
              </div>
              <span className="text-xl font-bold tracking-tight">
                <span className="text-foreground">Allo</span>
                <span className="text-primary">cra</span>
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-1">
            {navItems.map((item) => {
              const isActive = location === item.path || (item.path !== "/" && location.startsWith(item.path));
              return (
                <Link key={item.path} href={item.path}>
                  <button
                    className={cn(
                      "px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                      isActive
                        ? "bg-primary/15 text-primary border border-primary/20"
                        : "text-muted-foreground hover:text-foreground hover:bg-accent"
                    )}
                  >
                    {item.label}
                  </button>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
}
