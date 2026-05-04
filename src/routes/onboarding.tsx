import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Mascot } from "@/components/Mascot";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

export const Route = createFileRoute("/onboarding")({
  component: Onboarding,
  head: () => ({ meta: [{ title: "Set up your profile — Study Buddy" }] }),
});

const SUBJECTS = ["Maths", "Physics", "Chemistry", "Biology", "English", "Computer Science", "History", "Economics"];
const CLASSES = ["Class 9", "Class 10", "Class 11", "Class 12", "College Year 1", "College Year 2", "College Year 3+"];
const BOARDS = ["CBSE", "ICSE", "State Board", "JEE", "NEET", "University", "Other"];

function Onboarding() {
  const { user, profile, loading, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [classLevel, setClassLevel] = useState("");
  const [board, setBoard] = useState("");
  const [subjects, setSubjects] = useState<string[]>([]);
  const [chapter, setChapter] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
    if (profile?.onboarded) navigate({ to: "/dashboard" });
    if (profile && !name) setName(profile.display_name);
  }, [user, profile, loading, navigate, name]);

  const toggle = (s: string) => setSubjects((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));

  const finish = async () => {
    if (!user) return;
    if (!name.trim() || !classLevel || !board || subjects.length === 0) {
      return toast.error("Fill in everything to find your best buddies!");
    }
    setBusy(true);
    try {
      await supabase.from("profiles").update({
        display_name: name.trim().slice(0, 60),
        class_level: classLevel,
        board,
        onboarded: true,
      }).eq("id", user.id);

      // delete old subjects, insert new
      await supabase.from("user_subjects").delete().eq("user_id", user.id);
      await supabase.from("user_subjects").insert(
        subjects.map((s) => ({ user_id: user.id, subject: s, current_chapter: chapter.trim().slice(0, 100) || null }))
      );

      await refreshProfile();
      toast.success("You're in! Let's find your buddy 🚀");
      navigate({ to: "/dashboard" });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save");
    } finally { setBusy(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-lg glass rounded-3xl p-8 shadow-glow animate-slide-up">
        <div className="flex items-center gap-4 mb-6">
          <Mascot size={80} float={false} />
          <div>
            <div className="text-xs text-muted-foreground">Step {step} of 3</div>
            <h1 className="text-2xl font-bold">
              {step === 1 && "What should we call you?"}
              {step === 2 && "Where are you studying?"}
              {step === 3 && "What are you grinding?"}
            </h1>
          </div>
        </div>

        <div className="flex gap-1 mb-6">
          {[1,2,3].map((n) => (
            <div key={n} className={`h-1.5 flex-1 rounded-full transition-all ${n <= step ? "bg-gradient-to-r from-primary to-cyan" : "bg-muted"}`} />
          ))}
        </div>

        {step === 1 && (
          <div className="space-y-4 animate-slide-up">
            <div><Label>Your name</Label><Input value={name} onChange={(e) => setName(e.target.value)} maxLength={60} placeholder="Alex" className="rounded-xl h-11" /></div>
            <Button className="w-full rounded-xl h-11 bg-gradient-to-r from-primary to-cyan" onClick={() => name.trim() ? setStep(2) : toast.error("Tell us your name first")}>Next</Button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4 animate-slide-up">
            <div>
              <Label>Class / Year</Label>
              <Select value={classLevel} onValueChange={setClassLevel}>
                <SelectTrigger className="rounded-xl h-11"><SelectValue placeholder="Pick your class" /></SelectTrigger>
                <SelectContent>{CLASSES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Board / Stream</Label>
              <Select value={board} onValueChange={setBoard}>
                <SelectTrigger className="rounded-xl h-11"><SelectValue placeholder="Pick your board" /></SelectTrigger>
                <SelectContent>{BOARDS.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="rounded-xl" onClick={() => setStep(1)}>Back</Button>
              <Button className="flex-1 rounded-xl h-11 bg-gradient-to-r from-primary to-cyan" onClick={() => classLevel && board ? setStep(3) : toast.error("Pick both")}>Next</Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4 animate-slide-up">
            <div>
              <Label>Subjects you're studying</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {SUBJECTS.map((s) => {
                  const on = subjects.includes(s);
                  return (
                    <button key={s} onClick={() => toggle(s)}
                      className={`px-4 py-2 rounded-full text-sm font-semibold border transition-all ${on ? "bg-primary text-primary-foreground border-primary shadow-glow scale-105" : "bg-card border-border hover:border-primary"}`}>
                      {s}
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <Label>Current chapter (optional)</Label>
              <Input value={chapter} onChange={(e) => setChapter(e.target.value)} maxLength={100} placeholder="e.g. Trigonometry, Cell Biology" className="rounded-xl h-11" />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="rounded-xl" onClick={() => setStep(2)}>Back</Button>
              <Button disabled={busy} className="flex-1 rounded-xl h-11 bg-gradient-to-r from-primary to-cyan" onClick={finish}>{busy ? "..." : "Let's go! 🚀"}</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
