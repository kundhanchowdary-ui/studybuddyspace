import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { Mascot } from "@/components/Mascot";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2, Search, History as HistoryIcon, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import remarkGfm from "remark-gfm";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import { ShareableSolution } from "@/components/ShareableSolution";

export const Route = createFileRoute("/history")({
  component: History,
  head: () => ({ meta: [{ title: "History — Study Buddy" }] }),
});

type Doubt = { id: string; question: string; answer: string; created_at: string; subject: string | null; has_image: boolean };

function History() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<Doubt[]>([]);
  const [open, setOpen] = useState<string | null>(null);
  const [q, setQ] = useState("");

  useEffect(() => { if (!loading && !user) navigate({ to: "/auth" }); }, [user, loading, navigate]);

  async function load() {
    if (!user) return;
    const { data } = await supabase.from("solved_doubts").select("*").order("created_at", { ascending: false });
    setItems((data as Doubt[]) || []);
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [user]);

  async function remove(id: string) {
    setItems(p => p.filter(i => i.id !== id));
    await supabase.from("solved_doubts").delete().eq("id", id);
    toast.success("Removed");
  }

  const filtered = items.filter(i => (i.question + " " + i.answer).toLowerCase().includes(q.toLowerCase()));

  return (
    <AppShell>
      <div className="flex items-center gap-3 mb-5 animate-slide-up">
        <div className="hidden sm:block"><Mascot size={72} /></div>
        <div className="flex-1">
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2"><HistoryIcon className="w-6 h-6 text-primary" /> Doubt History</h1>
          <p className="text-sm text-muted-foreground">Revisit hints you've saved from the AI tutor.</p>
        </div>
      </div>

      <div className="relative mb-4">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input value={q} onChange={e => setQ(e.target.value)} placeholder="Search saved doubts…" className="pl-9 rounded-full" />
      </div>

      {filtered.length === 0 ? (
        <Card className="glass rounded-3xl p-10 text-center text-sm text-muted-foreground">
          {items.length === 0 ? "Nothing saved yet. Solve a doubt and tap Save to keep it here." : "No matches."}
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map(it => {
            const isOpen = open === it.id;
            return (
              <Card key={it.id} className="glass rounded-2xl overflow-hidden">
                <button onClick={() => setOpen(isOpen ? null : it.id)} className="w-full text-left p-4 flex items-center gap-3 hover:bg-muted/30 transition">
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold truncate">{it.question}</div>
                    <div className="text-xs text-muted-foreground">{new Date(it.created_at).toLocaleString()}</div>
                  </div>
                  <ChevronDown className={`w-4 h-4 transition ${isOpen ? "rotate-180" : ""}`} />
                </button>
                {isOpen && (
                  <div className="border-t border-border/40 p-4 space-y-3">
                    <div className="flex justify-end gap-2">
                      <ShareableSolution question={it.question} answer={it.answer} />
                      <Button size="sm" variant="ghost" onClick={() => remove(it.id)}><Trash2 className="w-4 h-4" /></Button>
                    </div>
                    <div className="prose prose-sm max-w-none prose-headings:font-display prose-strong:text-foreground prose-p:text-foreground/90 prose-li:text-foreground/90">
                      <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>{it.answer}</ReactMarkdown>
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}
