import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Mascot } from "@/components/Mascot";
import { toast } from "sonner";
import { AlertCircle, Sparkles, Search } from "lucide-react";

const searchSchema = z.object({ stuck: z.boolean().optional() });

export const Route = createFileRoute("/buddies")({
  component: Buddies,
  validateSearch: searchSchema,
  head: () => ({ meta: [{ title: "Find a buddy — Study Buddy" }] }),
});

type Struggle = {
  id: string;
  user_id: string;
  subject: string;
  chapter: string;
  class_level: string | null;
  message: string | null;
  created_at: string;
  profiles?: { display_name: string; avatar_url: string | null; level: number; current_streak: number };
};

function Buddies() {
  const { user, profile } = useAuth();
  const search = Route.useSearch();
  const [struggles, setStruggles] = useState<Struggle[]>([]);
  const [filterSubject, setFilterSubject] = useState("");
  const [showStuckForm, setShowStuckForm] = useState(!!search.stuck);
  const [subject, setSubject] = useState("");
  const [chapter, setChapter] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const fetchStruggles = async () => {
    const { data } = await supabase
      .from("struggles")
      .select("*, profiles(display_name, avatar_url, level, current_streak)")
      .eq("resolved", false)
      .order("created_at", { ascending: false })
      .limit(50);
    setStruggles((data as Struggle[]) || []);
  };

  useEffect(() => { fetchStruggles(); }, []);

  // Realtime subscription
  useEffect(() => {
    const ch = supabase
      .channel("struggles-feed")
      .on("postgres_changes", { event: "*", schema: "public", table: "struggles" }, () => fetchStruggles())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const filtered = useMemo(() => {
    if (!filterSubject.trim()) return struggles;
    const q = filterSubject.toLowerCase();
    return struggles.filter((s) => s.subject.toLowerCase().includes(q) || s.chapter.toLowerCase().includes(q));
  }, [struggles, filterSubject]);

  const submitStruggle = async () => {
    if (!user) return;
    try {
      z.string().min(1).max(60).parse(subject);
      z.string().min(1).max(120).parse(chapter);
    } catch { return toast.error("Subject and chapter required"); }
    setBusy(true);
    try {
      await supabase.from("struggles").insert({
        user_id: user.id,
        subject: subject.trim(),
        chapter: chapter.trim(),
        class_level: profile?.class_level ?? null,
        message: message.trim().slice(0, 240) || null,
      });
      toast.success("Signal sent! Watching for buddies… 📡");
      setSubject(""); setChapter(""); setMessage(""); setShowStuckForm(false);
      fetchStruggles();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally { setBusy(false); }
  };

  return (
    <AppShell>
      <div className="flex items-center gap-3 mb-2">
        <Mascot size={56} />
        <div>
          <h1 className="text-2xl font-bold">Find your buddy</h1>
          <p className="text-xs text-muted-foreground">Live signals from students stuck on the same chapter.</p>
        </div>
      </div>

      <Button
        onClick={() => setShowStuckForm((v) => !v)}
        className="w-full mt-4 mb-4 rounded-2xl h-14 bg-gradient-to-r from-primary to-cyan shadow-glow text-base font-bold"
      >
        <AlertCircle className="w-5 h-5 mr-2" />
        I'm stuck right now
      </Button>

      {showStuckForm && (
        <Card className="glass-strong rounded-2xl p-5 mb-6 animate-slide-up border-primary/30 border-2">
          <div className="flex items-center gap-2 mb-3"><Sparkles className="w-4 h-4 text-primary" /><span className="font-bold text-sm">Send a struggle signal</span></div>
          <div className="space-y-3">
            <div><Label>Subject</Label><Input value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={60} placeholder="Maths" className="rounded-xl" /></div>
            <div><Label>Chapter / Topic</Label><Input value={chapter} onChange={(e) => setChapter(e.target.value)} maxLength={120} placeholder="Trigonometry" className="rounded-xl" /></div>
            <div><Label>What's stuck? (optional)</Label><Input value={message} onChange={(e) => setMessage(e.target.value)} maxLength={240} placeholder="Can't crack identities..." className="rounded-xl" /></div>
            <Button disabled={busy} onClick={submitStruggle} className="w-full rounded-xl bg-gradient-to-r from-primary to-cyan">{busy ? "..." : "Match me ⚡"}</Button>
          </div>
        </Card>
      )}

      <div className="relative mb-4">
        <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input value={filterSubject} onChange={(e) => setFilterSubject(e.target.value)} placeholder="Search subject or chapter..." className="rounded-2xl pl-11 h-12" />
      </div>

      <div className="space-y-3">
        {filtered.length === 0 ? (
          <Card className="glass rounded-2xl p-8 text-center">
            <Mascot size={100} float={false} />
            <p className="text-sm text-muted-foreground mt-3">No signals yet. Be the first to ping someone!</p>
          </Card>
        ) : (
          filtered.map((s) => (
            <BuddyCard key={s.id} s={s} isMine={s.user_id === user?.id} />
          ))
        )}
      </div>
    </AppShell>
  );
}

function BuddyCard({ s, isMine }: { s: Struggle; isMine: boolean }) {
  const time = new Date(s.created_at);
  const mins = Math.max(1, Math.floor((Date.now() - time.getTime()) / 60000));
  const ago = mins < 60 ? `${mins}m ago` : `${Math.floor(mins / 60)}h ago`;
  const initials = (s.profiles?.display_name || "S").slice(0, 2).toUpperCase();

  return (
    <Card className="glass rounded-2xl p-4 hover:shadow-glow transition animate-slide-up">
      <div className="flex gap-3">
        <Avatar className="w-12 h-12 ring-2 ring-primary/30">
          <AvatarImage src={s.profiles?.avatar_url || undefined} />
          <AvatarFallback className="bg-gradient-to-br from-primary to-cyan text-primary-foreground font-bold">{initials}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold">{s.profiles?.display_name || "Student"}</span>
            {isMine && <span className="text-[10px] bg-primary/20 text-primary px-2 py-0.5 rounded-full font-semibold">YOU</span>}
            <span className="text-xs text-muted-foreground">· Lvl {s.profiles?.level ?? 1} · 🔥 {s.profiles?.current_streak ?? 0}d</span>
          </div>
          <div className="mt-1 flex flex-wrap gap-1.5">
            <span className="text-[11px] bg-primary/15 text-primary font-semibold px-2 py-0.5 rounded-full">{s.subject}</span>
            <span className="text-[11px] bg-cyan/20 text-cyan-foreground font-semibold px-2 py-0.5 rounded-full">{s.chapter}</span>
            {s.class_level && <span className="text-[11px] bg-muted text-muted-foreground font-semibold px-2 py-0.5 rounded-full">{s.class_level}</span>}
          </div>
          {s.message && <p className="text-sm mt-2 text-foreground/80">"{s.message}"</p>}
          <div className="text-[10px] text-muted-foreground mt-1">{ago}</div>
        </div>
        {!isMine && (
          <Button size="sm" variant="outline" className="rounded-full self-start">Wave 👋</Button>
        )}
      </div>
    </Card>
  );
}
