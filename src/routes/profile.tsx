import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { LogOut, Edit, GraduationCap, Award } from "lucide-react";

export const Route = createFileRoute("/profile")({
  component: ProfilePage,
  head: () => ({ meta: [{ title: "Profile — Study Buddy" }] }),
});

function ProfilePage() {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  if (!profile) return null;
  const initials = profile.display_name.slice(0, 2).toUpperCase();
  const xpProgress = ((profile.xp % 100) / 100) * 100;

  return (
    <AppShell>
      <Card className="glass-strong rounded-3xl p-6 text-center relative overflow-hidden mb-6">
        <div className="absolute inset-0 bg-gradient-mesh opacity-30 blur-2xl" />
        <div className="relative">
          <Avatar className="w-24 h-24 mx-auto ring-4 ring-primary/40 shadow-glow">
            <AvatarImage src={profile.avatar_url || undefined} />
            <AvatarFallback className="bg-gradient-to-br from-primary to-cyan text-primary-foreground text-2xl font-bold">{initials}</AvatarFallback>
          </Avatar>
          <h1 className="text-2xl font-bold mt-3">{profile.display_name}</h1>
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground mt-1">
            <GraduationCap className="w-4 h-4" />
            <span>{profile.class_level || "—"} · {profile.board || "—"}</span>
          </div>

          <div className="mt-5 max-w-xs mx-auto">
            <div className="flex justify-between text-xs mb-1"><span className="font-bold">Level {profile.level}</span><span className="text-muted-foreground">{profile.xp % 100}/100 XP</span></div>
            <div className="h-2 bg-muted rounded-full overflow-hidden"><div className="h-full bg-gradient-to-r from-primary to-cyan transition-all" style={{ width: `${xpProgress}%` }} /></div>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-3 gap-3 mb-6">
        <Card className="glass rounded-2xl p-4 text-center"><div className="text-2xl font-bold text-gradient">{profile.xp}</div><div className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">XP</div></Card>
        <Card className="glass rounded-2xl p-4 text-center"><div className="text-2xl font-bold text-gradient">🔥 {profile.current_streak}</div><div className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Streak</div></Card>
        <Card className="glass rounded-2xl p-4 text-center"><div className="text-2xl font-bold text-gradient">{Math.floor(profile.total_focus_minutes / 60)}h</div><div className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Focused</div></Card>
      </div>

      <div className="space-y-2">
        <Button variant="outline" className="w-full rounded-xl h-12 justify-start" onClick={() => navigate({ to: "/onboarding" })}>
          <Edit className="w-4 h-4 mr-3" /> Edit profile & subjects
        </Button>
        <Button variant="outline" className="w-full rounded-xl h-12 justify-start" onClick={() => navigate({ to: "/badges" })}>
          <Award className="w-4 h-4 mr-3" /> View badges
        </Button>
        <Button variant="outline" className="w-full rounded-xl h-12 justify-start text-destructive hover:text-destructive" onClick={async () => { await signOut(); navigate({ to: "/" }); }}>
          <LogOut className="w-4 h-4 mr-3" /> Sign out
        </Button>
      </div>
    </AppShell>
  );
}
