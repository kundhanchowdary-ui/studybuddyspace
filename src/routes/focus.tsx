import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mascot } from "@/components/Mascot";
import { toast } from "sonner";
import { Play, Pause, RotateCcw } from "lucide-react";

export const Route = createFileRoute("/focus")({
  component: Focus,
  head: () => ({ meta: [{ title: "Pomodoro — Study Buddy" }] }),
});

const FOCUS = 25 * 60;
const BREAK = 5 * 60;

function Focus() {
  const { user, refreshProfile } = useAuth();
  const [mode, setMode] = useState<"focus" | "break">("focus");
  const [secs, setSecs] = useState(FOCUS);
  const [running, setRunning] = useState(false);
  const [subject, setSubject] = useState("");
  const [chapter, setChapter] = useState("");
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!running) {
      if (tickRef.current) clearInterval(tickRef.current);
      return;
    }
    tickRef.current = setInterval(() => {
      setSecs((s) => {
        if (s <= 1) {
          if (tickRef.current) clearInterval(tickRef.current);
          handleComplete();
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => { if (tickRef.current) clearInterval(tickRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running]);

  const handleComplete = async () => {
    setRunning(false);
    if (mode === "focus") {
      const minutes = Math.round(FOCUS / 60);
      const xp = minutes * 2;
      if (user) {
        await supabase.from("focus_sessions").insert({
          user_id: user.id,
          subject: subject.trim().slice(0, 60) || null,
          chapter: chapter.trim().slice(0, 120) || null,
          duration_minutes: minutes,
          xp_earned: xp,
        });
        await refreshProfile();
        // Award badges
        await maybeAwardBadge(user.id, minutes);
      }
      toast.success(`🎉 Focus complete! +${xp} XP earned`);
      setMode("break");
      setSecs(BREAK);
    } else {
      toast.success("Break done! Back to grinding 💪");
      setMode("focus");
      setSecs(FOCUS);
    }
  };

  const reset = () => {
    setRunning(false);
    setSecs(mode === "focus" ? FOCUS : BREAK);
  };

  const total = mode === "focus" ? FOCUS : BREAK;
  const pct = ((total - secs) / total) * 100;
  const mm = String(Math.floor(secs / 60)).padStart(2, "0");
  const ss = String(secs % 60).padStart(2, "0");
  const r = 130;
  const c = 2 * Math.PI * r;

  return (
    <AppShell>
      <div className="flex items-center gap-3 mb-6">
        <Mascot size={56} />
        <div>
          <h1 className="text-2xl font-bold">Focus mode</h1>
          <p className="text-xs text-muted-foreground">25 min sprint · earn XP for every session.</p>
        </div>
      </div>

      <Card className="glass-strong rounded-3xl p-6 md:p-10 text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-mesh opacity-30 blur-2xl pointer-events-none" />

        <div className="inline-flex gap-1 p-1 glass rounded-full mb-6 relative">
          <button
            onClick={() => { setMode("focus"); setSecs(FOCUS); setRunning(false); }}
            className={`px-4 py-1.5 rounded-full text-xs font-bold transition ${mode === "focus" ? "bg-primary text-primary-foreground shadow-glow" : "text-muted-foreground"}`}
          >Focus 25m</button>
          <button
            onClick={() => { setMode("break"); setSecs(BREAK); setRunning(false); }}
            className={`px-4 py-1.5 rounded-full text-xs font-bold transition ${mode === "break" ? "bg-cyan text-cyan-foreground shadow-glow-cyan" : "text-muted-foreground"}`}
          >Break 5m</button>
        </div>

        <div className="relative w-72 h-72 mx-auto my-4">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 300 300">
            <circle cx="150" cy="150" r={r} fill="none" stroke="currentColor" strokeWidth="14" className="text-muted opacity-40" />
            <circle
              cx="150" cy="150" r={r} fill="none"
              stroke={`url(#${mode}-grad)`}
              strokeWidth="14" strokeLinecap="round"
              strokeDasharray={c}
              strokeDashoffset={c - (c * pct) / 100}
              className="transition-all duration-700"
            />
            <defs>
              <linearGradient id="focus-grad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="oklch(0.58 0.24 295)" />
                <stop offset="100%" stopColor="oklch(0.78 0.16 200)" />
              </linearGradient>
              <linearGradient id="break-grad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="oklch(0.78 0.16 200)" />
                <stop offset="100%" stopColor="oklch(0.88 0.17 90)" />
              </linearGradient>
            </defs>
          </svg>
          <div className="absolute inset-0 grid place-items-center">
            <div>
              <div className="font-display text-6xl md:text-7xl font-bold tabular-nums">{mm}:{ss}</div>
              <div className="text-xs text-muted-foreground uppercase tracking-widest font-semibold mt-1">{mode === "focus" ? "Stay focused" : "Take a breath"}</div>
            </div>
          </div>
        </div>

        <div className="flex gap-3 justify-center mt-4 relative">
          <Button size="lg" onClick={() => setRunning((r) => !r)} className="rounded-full bg-gradient-to-r from-primary to-cyan h-14 px-8 shadow-glow">
            {running ? <><Pause className="w-5 h-5 mr-2" /> Pause</> : <><Play className="w-5 h-5 mr-2" /> Start</>}
          </Button>
          <Button size="lg" variant="outline" onClick={reset} className="rounded-full h-14 px-5"><RotateCcw className="w-5 h-5" /></Button>
        </div>
      </Card>

      <Card className="glass rounded-2xl p-5 mt-6">
        <h3 className="font-bold mb-3 text-sm">What are you studying?</h3>
        <div className="grid sm:grid-cols-2 gap-3">
          <div><Label>Subject</Label><Input value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={60} placeholder="Physics" className="rounded-xl" /></div>
          <div><Label>Chapter</Label><Input value={chapter} onChange={(e) => setChapter(e.target.value)} maxLength={120} placeholder="Optics" className="rounded-xl" /></div>
        </div>
      </Card>
    </AppShell>
  );
}

const BADGES = [
  { code: "first_session", min: 1, name: "First Sprint", emoji: "🚀" },
  { code: "focus_rookie", min: 600, name: "Focus Rookie", emoji: "📚" },
  { code: "deep_diver", min: 3000, name: "Deep Diver", emoji: "🌊" },
];

async function maybeAwardBadge(userId: string, addedMinutes: number) {
  const { data: profile } = await supabase.from("profiles").select("total_focus_minutes, current_streak").eq("id", userId).maybeSingle();
  if (!profile) return;
  const totalNow = profile.total_focus_minutes + addedMinutes;
  for (const b of BADGES) {
    if (totalNow >= b.min) {
      const { error } = await supabase.from("user_badges").insert({ user_id: userId, badge_code: b.code });
      if (!error) toast.success(`${b.emoji} Badge unlocked: ${b.name}!`);
    }
  }
  if (profile.current_streak >= 7) {
    const { error } = await supabase.from("user_badges").insert({ user_id: userId, badge_code: "study_warrior" });
    if (!error) toast.success("🔥 Badge unlocked: Study Warrior!");
  }
}
