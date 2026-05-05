import { Link, useLocation } from "@tanstack/react-router";
import { Home, Users, Timer, Trophy, User, Sparkles, CalendarDays, History } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

const tabs = [
  { to: "/dashboard", icon: Home, label: "Home" },
  { to: "/planner", icon: CalendarDays, label: "Planner" },
  { to: "/buddies", icon: Users, label: "Buddies" },
  { to: "/solve", icon: Sparkles, label: "Solve" },
  { to: "/history", icon: History, label: "History" },
  { to: "/focus", icon: Timer, label: "Focus" },
  { to: "/badges", icon: Trophy, label: "Badges" },
  { to: "/profile", icon: User, label: "Profile" },
];

export function AppShell({ children }: { children: ReactNode }) {
  const loc = useLocation();
  return (
    <div className="min-h-screen pb-24 md:pb-8 md:pl-64">
      {/* Sidebar (desktop) */}
      <aside className="hidden md:flex fixed left-0 top-0 bottom-0 w-64 p-6 flex-col gap-2 glass z-40">
        <Link to="/dashboard" className="flex items-center gap-2 mb-8">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary to-cyan flex items-center justify-center text-primary-foreground font-bold text-lg shadow-glow">SB</div>
          <span className="font-display font-bold text-lg">Study Buddy</span>
        </Link>
        {tabs.map((t) => {
          const active = loc.pathname.startsWith(t.to);
          return (
            <Link
              key={t.to}
              to={t.to}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium",
                active ? "bg-primary text-primary-foreground shadow-glow" : "hover:bg-muted text-foreground/80"
              )}
            >
              <t.icon className="w-5 h-5" />
              {t.label}
            </Link>
          );
        })}
      </aside>

      <main className="px-4 md:px-8 py-6 md:py-10 max-w-5xl mx-auto">{children}</main>

      {/* Bottom nav (mobile) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 glass-strong border-t border-border z-40 px-2 pt-2 pb-3">
        <div className="flex justify-around">
          {tabs.map((t) => {
            const active = loc.pathname.startsWith(t.to);
            return (
              <Link
                key={t.to}
                to={t.to}
                className={cn(
                  "flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all min-w-[60px]",
                  active ? "text-primary" : "text-muted-foreground"
                )}
              >
                <t.icon className={cn("w-5 h-5 transition-transform", active && "scale-110")} />
                <span className="text-[10px] font-semibold">{t.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
