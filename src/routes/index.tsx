import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Mascot } from "@/components/Mascot";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { Users, Timer, Brain, Flame } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Landing,
});

const slides = [
  { icon: Users, title: "Find your study buddy", desc: "Match with students fighting the same chapter as you.", tint: "from-primary to-cyan" },
  { icon: Timer, title: "Focus together", desc: "Sync Pomodoro timers and grind side-by-side.", tint: "from-cyan to-sunshine" },
  { icon: Brain, title: "Stuck? Get unstuck.", desc: "Hit the panic button — instantly meet others stuck on the same topic.", tint: "from-sunshine to-primary" },
  { icon: Flame, title: "Level up your streak", desc: "Earn XP, unlock badges, and watch your streak ignite.", tint: "from-primary to-sunshine" },
];

function Landing() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [i, setI] = useState(0);

  useEffect(() => {
    if (!loading && user) navigate({ to: "/dashboard" });
  }, [user, loading, navigate]);

  useEffect(() => {
    const t = setInterval(() => setI((v) => (v + 1) % slides.length), 3500);
    return () => clearInterval(t);
  }, []);

  const s = slides[i];
  const Icon = s.icon;

  return (
    <div className="min-h-screen flex flex-col">
      <header className="px-6 py-5 flex items-center justify-between max-w-6xl mx-auto w-full">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary to-cyan flex items-center justify-center text-primary-foreground font-bold shadow-glow">SB</div>
          <span className="font-display font-bold text-lg">Study Buddy</span>
        </div>
        <Button variant="ghost" onClick={() => navigate({ to: "/auth" })}>Sign in</Button>
      </header>

      <section className="flex-1 grid md:grid-cols-2 gap-8 items-center px-6 max-w-6xl mx-auto w-full py-10">
        <div className="space-y-6 animate-slide-up">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full glass text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-success animate-pulse" /> Built for class 9 — college
          </div>
          <h1 className="text-5xl md:text-6xl font-bold leading-[1.05]">
            Find someone fighting the <span className="text-gradient">same chapter boss.</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-md">
            Study Buddy matches you with peers studying the same subject, chapter, and grade — so you never grind alone.
          </p>
          <div className="flex gap-3 flex-wrap">
            <Button size="lg" className="rounded-full shadow-glow bg-gradient-to-r from-primary to-cyan hover:opacity-95 transition" onClick={() => navigate({ to: "/auth" })}>
              Get started — free
            </Button>
            <Button size="lg" variant="outline" className="rounded-full" onClick={() => navigate({ to: "/auth" })}>
              I'm stuck right now
            </Button>
          </div>
          <div className="flex gap-6 pt-4 text-sm">
            <div><div className="text-2xl font-bold text-gradient">XP</div><div className="text-muted-foreground">Level up daily</div></div>
            <div><div className="text-2xl font-bold text-gradient">🔥</div><div className="text-muted-foreground">Build streaks</div></div>
            <div><div className="text-2xl font-bold text-gradient">⚡</div><div className="text-muted-foreground">Live matching</div></div>
          </div>
        </div>

        <div className="relative flex items-center justify-center">
          <div className="absolute inset-0 bg-gradient-mesh opacity-60 blur-3xl" />
          <div className="relative">
            <Mascot size={280} />
            <div key={i} className="glass-strong absolute -bottom-6 -left-6 md:-left-16 rounded-2xl p-4 max-w-[260px] animate-pop-in shadow-glow">
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${s.tint} flex items-center justify-center mb-2`}>
                <Icon className="w-5 h-5 text-primary-foreground" />
              </div>
              <div className="font-semibold text-sm">{s.title}</div>
              <div className="text-xs text-muted-foreground mt-1">{s.desc}</div>
            </div>
            <div className="absolute -top-4 right-0 glass-strong rounded-2xl p-3 animate-float shadow-glow-cyan">
              <div className="text-xs font-semibold">🔥 7 day streak</div>
            </div>
          </div>
        </div>
      </section>

      <footer className="text-center text-xs text-muted-foreground py-6">Made with 💜 for students who refuse to study alone.</footer>
    </div>
  );
}
