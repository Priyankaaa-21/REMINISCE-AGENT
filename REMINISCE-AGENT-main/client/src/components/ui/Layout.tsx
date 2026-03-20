import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { LogOut, Home, UserCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface LayoutProps {
  children: ReactNode;
  variant?: "caretaker" | "patient";
  caretakerName?: string;
}

export function Layout({ children, variant = "caretaker", caretakerName }: LayoutProps) {
  const { logout, user } = useAuth();
  const [location] = useLocation();

  if (variant === "patient") {
    // Specialized High Contrast Layout for Patients
    return (
      <div className="min-h-screen bg-background text-foreground patient-mode transition-colors duration-300">
        <header className="p-4 sm:p-6 border-b-4 border-primary/30 flex flex-col sm:flex-row items-center justify-between gap-4 bg-secondary">
          <div className="flex flex-col items-center sm:items-start gap-2 w-full sm:w-auto">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-primary rounded-full flex items-center justify-center text-primary-foreground font-bold text-2xl sm:text-3xl">
                {user?.username?.[0]?.toUpperCase()}
              </div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-display font-bold">Hello, {user?.username}</h1>
            </div>
            {caretakerName && (
              <p className="text-base sm:text-lg text-muted-foreground ml-0 sm:ml-16 mt-1">
                Your caretaker: <span className="font-semibold text-foreground">{caretakerName}</span>
              </p>
            )}
          </div>
          <button 
            onClick={() => logout.mutate()} 
            className="px-6 py-3 sm:px-8 sm:py-4 bg-muted border-2 border-muted-foreground text-foreground text-lg sm:text-xl font-bold rounded-xl hover:bg-muted/80"
          >
            Sign Out
          </button>
        </header>
        <main className="p-4 sm:p-6 md:p-12 max-w-7xl mx-auto space-y-8 sm:space-y-12">
          {children}
        </main>
      </div>
    );
  }

  // Modern, Clean Layout for Caretakers
  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-border/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-14 sm:h-16">
            <div className="flex items-center gap-4 sm:gap-8">
              <div className="flex-shrink-0 flex items-center gap-2">
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-bold font-display text-base sm:text-lg">
                  R
                </div>
                <span className="font-display font-bold text-lg sm:text-xl tracking-tight text-foreground">
                  Reminisce AI
                </span>
              </div>
              
              <div className="hidden md:flex gap-1">
                <Link href="/caretaker/dashboard" className={cn(
                  "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                  location === "/caretaker/dashboard" 
                    ? "bg-primary/10 text-primary" 
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}>
                  Dashboard
                </Link>
                {/* Future navigation items can go here */}
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-4">
              <span className="text-xs sm:text-sm text-muted-foreground font-medium hidden sm:block">
                Caretaker: <span className="text-foreground">{user?.username}</span>
              </span>
              <div className="h-6 w-px bg-border hidden sm:block" />
              <button
                onClick={() => logout.mutate()}
                className="p-2 rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                title="Sign out"
              >
                <LogOut className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-6 sm:py-8 md:py-12">
        {children}
      </main>
    </div>
  );
}
