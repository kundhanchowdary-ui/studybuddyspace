import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { Mascot } from "@/components/Mascot";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, ImagePlus, X, Send, Loader2, Lightbulb, BookmarkPlus } from "lucide-react";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import remarkGfm from "remark-gfm";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import { ShareableSolution } from "@/components/ShareableSolution";

export const Route = createFileRoute("/solve")({
  component: Solve,
  head: () => ({ meta: [{ title: "AI Doubt Solver — Study Buddy" }] }),
});

const FN_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/solve-doubt`;

function Solve() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [question, setQuestion] = useState("");
  const [imageData, setImageData] = useState<string | null>(null);
  const [answer, setAnswer] = useState("");
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [user, loading, navigate]);

  async function onPickImage(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 6 * 1024 * 1024) {
      toast.error("Image must be under 6MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setImageData(reader.result as string);
    reader.readAsDataURL(f);
  }

  async function solve() {
    if (!question.trim() && !imageData) {
      toast.error("Type a question or upload an image first");
      return;
    }
    setAnswer("");
    setBusy(true);
    const ctl = new AbortController();
    abortRef.current = ctl;

    try {
      const resp = await fetch(FN_URL, {
        method: "POST",
        signal: ctl.signal,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ question, imageBase64: imageData }),
      });

      if (resp.status === 429) { toast.error("Too many requests. Try again in a moment."); return; }
      if (resp.status === 402) { toast.error("AI credits exhausted."); return; }
      if (!resp.ok || !resp.body) { toast.error("Couldn't reach the tutor."); return; }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      let done = false;
      while (!done) {
        const { value, done: d } = await reader.read();
        if (d) break;
        buf += decoder.decode(value, { stream: true });
        let nl;
        while ((nl = buf.indexOf("\n")) !== -1) {
          let line = buf.slice(0, nl);
          buf = buf.slice(nl + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const json = line.slice(6).trim();
          if (json === "[DONE]") { done = true; break; }
          try {
            const parsed = JSON.parse(json);
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) setAnswer((prev) => prev + delta);
          } catch {
            buf = line + "\n" + buf;
            break;
          }
        }
      }
    } catch (e: any) {
      if (e.name !== "AbortError") {
        console.error(e);
        toast.error("Something went wrong");
      }
    } finally {
      setBusy(false);
      abortRef.current = null;
    }
  }

  function stop() {
    abortRef.current?.abort();
    setBusy(false);
  }

  return (
    <AppShell>
      <div className="mb-6 flex items-center gap-3 animate-slide-up">
        <div className="hidden sm:block"><Mascot size={84} /></div>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
            AI Doubt Solver <Sparkles className="w-6 h-6 text-primary" />
          </h1>
          <p className="text-sm text-muted-foreground">Stuck? Get progressive hints — not just the answer.</p>
        </div>
      </div>

      <Card className="glass-strong rounded-3xl p-4 md:p-5 mb-4">
        <Textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Type your question… e.g. ‘A ball is thrown at 20 m/s at 30°. Find max height.’"
          className="min-h-[110px] resize-none bg-transparent border-0 focus-visible:ring-0 text-base"
          disabled={busy}
        />

        {imageData && (
          <div className="relative inline-block mt-2">
            <img src={imageData} alt="Question" className="max-h-40 rounded-xl border border-border" />
            <button
              onClick={() => setImageData(null)}
              className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-destructive text-destructive-foreground grid place-items-center shadow"
              aria-label="Remove image"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        <div className="flex items-center justify-between mt-3 gap-2">
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onPickImage} />
          <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={busy} className="rounded-full">
            <ImagePlus className="w-4 h-4" /> Add image
          </Button>
          {busy ? (
            <Button onClick={stop} variant="secondary" className="rounded-full">
              <Loader2 className="w-4 h-4 animate-spin" /> Stop
            </Button>
          ) : (
            <Button onClick={solve} className="rounded-full bg-gradient-to-r from-primary to-cyan text-primary-foreground shadow-glow">
              <Send className="w-4 h-4" /> Get hints
            </Button>
          )}
        </div>
      </Card>

      {(answer || busy) && (
        <Card className="glass rounded-3xl p-5 md:p-6">
          <div className="flex items-center gap-2 mb-3 text-sm font-semibold text-primary">
            <Lightbulb className="w-4 h-4" /> Tutor response
          </div>
          {answer ? (
            <div className="prose prose-sm md:prose-base max-w-none prose-headings:font-display prose-strong:text-foreground prose-p:text-foreground/90 prose-li:text-foreground/90">
              <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>
                {answer}
              </ReactMarkdown>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Loader2 className="w-4 h-4 animate-spin" /> Thinking…
            </div>
          )}
        </Card>
      )}

      {!answer && !busy && (
        <div className="grid sm:grid-cols-2 gap-3 mt-4">
          {[
            "Explain Newton's third law with an example.",
            "Solve: ∫ x·sin(x) dx",
            "What is the difference between mitosis and meiosis?",
            "Balance: Fe + O₂ → Fe₂O₃",
          ].map((q) => (
            <button
              key={q}
              onClick={() => setQuestion(q)}
              className="glass rounded-2xl p-3 text-left text-sm hover:shadow-glow transition"
            >
              💡 {q}
            </button>
          ))}
        </div>
      )}
    </AppShell>
  );
}
