import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { Mascot } from "@/components/Mascot";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Flame, Timer, Users, AlertCircle, Zap, BookOpen } from "lucide-react";

export const Route = createFileRoute("/dashboard")({
  component: Dashboard,
  head: () => ({ meta: [{ title: "Home — Study Buddy" }] }),
});

type Subj = { subject: string; current_chapter: string | null };

function Dashboard() {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const [subjects, setSubjects] = useState<Subj[]>([]);
  const [activeBuddies, setActiveBuddies] = useState(0);
  const [todayStruggles, setTodayStruggles] = useState(0);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
    if (!loading && profile && !profile.onboarded) navigate({ to: "/onboarding" });
  }, [user, profile, loading, navigate]);

  useEffect(() => {
    if (!user) return;
    supabase.from("user_subjects").select("subject, current_chapter").eq("user_id", user.id).then(({ data }) => setSubjects(data || []));
    supabase.from("profiles").select("id", { count: "exact", head: true }).then(({ count }) => setActiveBuddies(count || 0));
    supabase.from("struggles").select("id", { count: "exact", head: true }).eq("resolved", false).then(({ count }) => setTodayStruggles(count || 0));
  }, [user]);

  if (!profile) return <div className="min-h-screen grid place-items-center"><Mascot size={120} /></div>;

  const xpToNext = profile.level * 100;
  const xpProgress = ((profile.xp % 100) / 100) * 100;
  const greeting = new Date().getHours() < 12 ? "Good morning" : new Date().getHours() < 18 ? "Good afternoon" : "Good evening";

  return (
    <AppShell>
      {/* Hero greeting */}
      <div className="relative glass rounded-3xl p-6 mb-6 overflow-hidden animate-slide-up">
        <div className="absolute -right-8 -top-4 opacity-90 hidden sm:block"><Mascot size={140} /></div>
        <div className="relative max-w-md">
          <div className="text-xs text-muted-foreground font-semibold">{greeting}</div>
          <h1 className="text-2xl md:text-3xl font-bold mt-1">Hey {profile.display_name.split(" ")[0]} 👋</h1>
          <p className="text-sm text-muted-foreground mt-1">Ready to slay another chapter?</p>

          <div className="mt-4 space-y-2">
            <div className="flex justify-between text-xs"><span className="font-semibold">Level {profile.level}</span><span className="text-muted-foreground">{profile.xp % 100} / 100 XP</span></div>
            <Progress value={xpProgress} className="h-2" />
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <StatCard icon={<Flame className="w-5 h-5" />} label="Streak" value={`${profile.current_streak}d`} tint="from-sunshine to-primary" />
        <StatCard icon={<Zap className="w-5 h-5" />} label="XP" value={profile.xp} tint="from-primary to-cyan" />
        <StatCard icon={<Timer className="w-5 h-5" />} label="Focus" value={`${Math.floor(profile.total_focus_minutes / 60)}h`} tint="from-cyan to-sunshine" />
      </div>

      {/* Struggle button */}
      <Link to="/buddies" search={{ stuck: true }} className="block mb-6">
        <Card className="glass-strong border-2 border-primary/30 p-5 rounded-3xl hover:scale-[1.01] transition cursor-pointer animate-pulse-glow">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-cyan grid place-items-center text-primary-foreground shadow-glow">
              <AlertCircle className="w-7 h-7" />
            </div>
            <div className="flex-1">
              <div className="font-bold text-base">I'm stuck on a chapter 😩</div>
              <div className="text-xs text-muted-foreground">Instantly match with someone fighting the same boss.</div>
            </div>
            <span className="text-2xl">🚨</span>
          </div>
        </Card>
      </Link>

      {/* Quick actions */}
      <div className="grid sm:grid-cols-2 gap-3 mb-6">
        <ActionCard to="/buddies" icon={<Users />} title="Find a buddy" desc="Match by subject + chapter" tint="from-primary to-cyan" />
        <ActionCard to="/focus" icon={<Timer />} title="Pomodoro" desc="25 min focus sprint" tint="from-cyan to-sunshine" />
      </div>

      {/* Today's chapters */}
      <h2 className="text-lg font-bold mb-3 mt-4">Continue studying 📚</h2>
      <div className="grid sm:grid-cols-2 gap-3">
        {subjects.length === 0 ? (
          <Card className="glass p-5 rounded-2xl col-span-full text-center text-sm text-muted-foreground">
            Add subjects in your profile to track them here.
          </Card>
        ) : subjects.map((s, i) => (
          <Card key={i} className="glass p-4 rounded-2xl hover:shadow-glow transition cursor-pointer">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-cyan/20 grid place-items-center"><BookOpen className="w-5 h-5 text-primary" /></div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold truncate">{s.subject}</div>
                <div className="text-xs text-muted-foreground truncate">{s.current_chapter || "Tap to set chapter"}</div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="mt-6 text-xs text-muted-foreground text-center">
        🌍 {activeBuddies} students on the platform · 🔥 {todayStruggles} stuck right now
      </div>
    </AppShell>
  );
}

function StatCard({ icon, label, value, tint }: { icon: React.ReactNode; label: string; value: string | number; tint: string }) {
  return (
    <div className="glass rounded-2xl p-3 text-center">
      <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${tint} mx-auto grid place-items-center text-primary-foreground shadow-glow mb-1`}>{icon}</div>
      <div className="text-xl font-bold">{value}</div>
      <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">{label}</div>
    </div>
  );
}

function ActionCard({ to, icon, title, desc, tint }: { to: string; icon: React.ReactNode; title: string; desc: string; tint: string }) {
  return (
    <Link to={to as never}>
      <Card className="glass p-4 rounded-2xl hover:shadow-glow hover:scale-[1.02] transition cursor-pointer h-full">
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${tint} grid place-items-center text-primary-foreground shadow-glow`}>{icon}</div>
          <div>
            <div className="font-bold">{title}</div>
            <div className="text-xs text-muted-foreground">{desc}</div>
          </div>
        </div>
      </Card>
    </Link>
  );
}
