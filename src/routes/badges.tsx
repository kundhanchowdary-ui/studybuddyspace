import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Mascot } from "@/components/Mascot";

export const Route = createFileRoute("/badges")({
  component: Badges,
  head: () => ({ meta: [{ title: "Badges — Study Buddy" }] }),
});

const ALL_BADGES = [
  { code: "first_session", name: "First Sprint", emoji: "🚀", desc: "Complete your first focus session" },
  { code: "focus_rookie", name: "Focus Rookie", emoji: "📚", desc: "Study for 10 hours total" },
  { code: "deep_diver", name: "Deep Diver", emoji: "🌊", desc: "Study for 50 hours total" },
  { code: "study_warrior", name: "Study Warrior", emoji: "🔥", desc: "Maintain a 7-day streak" },
  { code: "buddy_finder", name: "Buddy Finder", emoji: "🤝", desc: "Match with 5 study buddies" },
  { code: "night_owl", name: "Night Owl", emoji: "🦉", desc: "Study after midnight" },
  { code: "early_bird", name: "Early Bird", emoji: "🌅", desc: "Study before 6 AM" },
  { code: "chapter_champion", name: "Chapter Champion", emoji: "🏆", desc: "Finish 10 chapters" },
];

function Badges() {
  const { user, profile } = useAuth();
  const [earned, setEarned] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!user) return;
    supabase.from("user_badges").select("badge_code").eq("user_id", user.id).then(({ data }) => {
      setEarned(new Set((data || []).map((b) => b.badge_code)));
    });
  }, [user]);

  return (
    <AppShell>
      <div className="flex items-center gap-3 mb-6">
        <Mascot size={56} />
        <div>
          <h1 className="text-2xl font-bold">Achievements</h1>
          <p className="text-xs text-muted-foreground">{earned.size} of {ALL_BADGES.length} unlocked</p>
        </div>
      </div>

      <Card className="glass-strong rounded-3xl p-6 mb-6 text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-mesh opacity-25 blur-2xl" />
        <div className="relative">
          <div className="text-5xl font-bold text-gradient">{profile?.xp ?? 0}</div>
          <div className="text-xs uppercase tracking-widest font-semibold text-muted-foreground mt-1">Total XP</div>
          <div className="flex justify-center gap-6 mt-4 text-sm">
            <div><div className="text-2xl font-bold">🔥 {profile?.current_streak ?? 0}</div><div className="text-xs text-muted-foreground">Current</div></div>
            <div><div className="text-2xl font-bold">⭐ {profile?.longest_streak ?? 0}</div><div className="text-xs text-muted-foreground">Best</div></div>
            <div><div className="text-2xl font-bold">🎯 {profile?.level ?? 1}</div><div className="text-xs text-muted-foreground">Level</div></div>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {ALL_BADGES.map((b) => {
          const got = earned.has(b.code);
          return (
            <Card key={b.code} className={`glass rounded-2xl p-4 text-center transition-all ${got ? "shadow-glow ring-1 ring-primary/40 animate-pop-in" : "opacity-50 grayscale"}`}>
              <div className="text-4xl mb-2">{b.emoji}</div>
              <div className="font-bold text-sm">{b.name}</div>
              <div className="text-[10px] text-muted-foreground mt-1">{b.desc}</div>
              {got && <div className="text-[10px] mt-2 text-primary font-bold">✓ UNLOCKED</div>}
            </Card>
          );
        })}
      </div>
    </AppShell>
  );
}
