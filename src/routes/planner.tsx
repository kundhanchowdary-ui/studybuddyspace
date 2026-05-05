import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { Mascot } from "@/components/Mascot";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { ChevronLeft, ChevronRight, Plus, Bell, BellOff, Trash2, CheckCircle2, Target } from "lucide-react";
import { toast } from "sonner";
import { DndContext, useDraggable, useDroppable, PointerSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from "recharts";
import { ensureNotificationPermission } from "@/lib/reminders";

export const Route = createFileRoute("/planner")({
  component: Planner,
  head: () => ({ meta: [{ title: "Planner — Study Buddy" }] }),
});

type Item = {
  id: string;
  title: string;
  subject: string | null;
  chapter: string | null;
  scheduled_date: string;
  start_minute: number;
  duration_minutes: number;
  reminder_minutes_before: number;
  reminder_enabled: boolean;
  completed: boolean;
};

const HOURS = Array.from({ length: 16 }, (_, i) => i + 6); // 6am-9pm
const fmtDate = (d: Date) => d.toISOString().slice(0, 10);
const minToLabel = (m: number) => {
  const h = Math.floor(m / 60); const mm = m % 60;
  const ampm = h >= 12 ? "pm" : "am"; const h12 = ((h + 11) % 12) + 1;
  return `${h12}:${mm.toString().padStart(2, "0")}${ampm}`;
};

function startOfWeek(d: Date) {
  const x = new Date(d); const day = x.getDay(); // 0 Sun
  x.setDate(x.getDate() - day); x.setHours(0,0,0,0); return x;
}

function Planner() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [items, setItems] = useState<Item[]>([]);
  const [goal, setGoal] = useState(60);
  const [history, setHistory] = useState<{ date: string; minutes: number }[]>([]);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState({ title: "", subject: "", chapter: "", date: fmtDate(new Date()), start: 540, duration: 30, reminder: 10, reminderOn: true });
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const week = useMemo(() => Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart); d.setDate(weekStart.getDate() + i); return d;
  }), [weekStart]);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [user, loading, navigate]);

  async function loadAll() {
    if (!user) return;
    const start = fmtDate(week[0]); const end = fmtDate(week[6]);
    const todayStr = fmtDate(new Date());
    const [{ data: pi }, { data: g }, { data: sessions }] = await Promise.all([
      supabase.from("planner_items").select("*").gte("scheduled_date", start).lte("scheduled_date", end).order("start_minute"),
      supabase.from("daily_goals").select("target_minutes").eq("goal_date", todayStr).maybeSingle(),
      supabase.from("focus_sessions").select("duration_minutes, completed_at").gte("completed_at", new Date(Date.now() - 7 * 86400000).toISOString()),
    ]);
    setItems((pi as Item[]) || []);
    if (g) setGoal(g.target_minutes);
    const buckets: Record<string, number> = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i); buckets[fmtDate(d)] = 0;
    }
    (sessions || []).forEach((s: any) => {
      const k = s.completed_at.slice(0, 10);
      if (k in buckets) buckets[k] += s.duration_minutes;
    });
    setHistory(Object.entries(buckets).map(([date, minutes]) => ({ date: date.slice(5), minutes })));
  }

  useEffect(() => { loadAll(); /* eslint-disable-next-line */ }, [user, weekStart]);

  const todayMinutes = history[history.length - 1]?.minutes ?? 0;
  const goalPct = Math.min(100, (todayMinutes / Math.max(1, goal)) * 100);

  async function saveGoal(v: number) {
    setGoal(v);
    if (!user) return;
    await supabase.from("daily_goals").upsert({ user_id: user.id, goal_date: fmtDate(new Date()), target_minutes: v }, { onConflict: "user_id,goal_date" });
    toast.success("Goal saved");
  }

  async function createItem() {
    if (!user || !draft.title.trim()) { toast.error("Add a title"); return; }
    const { error } = await supabase.from("planner_items").insert({
      user_id: user.id,
      title: draft.title.trim(),
      subject: draft.subject || null,
      chapter: draft.chapter || null,
      scheduled_date: draft.date,
      start_minute: draft.start,
      duration_minutes: draft.duration,
      reminder_minutes_before: draft.reminder,
      reminder_enabled: draft.reminderOn,
    });
    if (error) { toast.error(error.message); return; }
    if (draft.reminderOn) await ensureNotificationPermission();
    setOpen(false);
    setDraft({ ...draft, title: "", subject: "", chapter: "" });
    loadAll();
    toast.success("Added to planner");
  }

  async function moveItem(id: string, date: string, start: number) {
    setItems(prev => prev.map(i => i.id === id ? { ...i, scheduled_date: date, start_minute: start } : i));
    await supabase.from("planner_items").update({ scheduled_date: date, start_minute: start }).eq("id", id);
  }

  async function toggleComplete(it: Item) {
    setItems(prev => prev.map(i => i.id === it.id ? { ...i, completed: !i.completed } : i));
    await supabase.from("planner_items").update({ completed: !it.completed }).eq("id", it.id);
  }

  async function toggleReminder(it: Item) {
    if (!it.reminder_enabled) await ensureNotificationPermission();
    setItems(prev => prev.map(i => i.id === it.id ? { ...i, reminder_enabled: !i.reminder_enabled } : i));
    await supabase.from("planner_items").update({ reminder_enabled: !it.reminder_enabled }).eq("id", it.id);
  }

  async function deleteItem(id: string) {
    setItems(prev => prev.filter(i => i.id !== id));
    await supabase.from("planner_items").delete().eq("id", id);
  }

  function onDragEnd(e: DragEndEvent) {
    const id = String(e.active.id);
    const over = e.over?.id ? String(e.over.id) : null;
    if (!over) return;
    const [date, hourStr] = over.split("|");
    const it = items.find(i => i.id === id); if (!it) return;
    const newStart = parseInt(hourStr, 10) * 60 + (it.start_minute % 60);
    moveItem(id, date, newStart);
  }

  return (
    <AppShell>
      <DndContext sensors={sensors} onDragEnd={onDragEnd}>
        <div className="flex items-center gap-3 mb-5 animate-slide-up">
          <div className="hidden sm:block"><Mascot size={72} /></div>
          <div className="flex-1">
            <h1 className="text-2xl md:text-3xl font-bold">Study Planner 🗓️</h1>
            <p className="text-sm text-muted-foreground">Drag, drop, and crush your week.</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="rounded-full bg-gradient-to-r from-primary to-cyan text-primary-foreground shadow-glow"><Plus className="w-4 h-4" /> Add</Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader><DialogTitle>New study session</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label>Title</Label><Input value={draft.title} onChange={e => setDraft({...draft, title: e.target.value})} placeholder="e.g. Quadratic equations practice" /></div>
                <div className="grid grid-cols-2 gap-2">
                  <div><Label>Subject</Label><Input value={draft.subject} onChange={e => setDraft({...draft, subject: e.target.value})} /></div>
                  <div><Label>Chapter</Label><Input value={draft.chapter} onChange={e => setDraft({...draft, chapter: e.target.value})} /></div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div><Label>Date</Label><Input type="date" value={draft.date} onChange={e => setDraft({...draft, date: e.target.value})} /></div>
                  <div><Label>Start</Label><Input type="time" value={`${String(Math.floor(draft.start/60)).padStart(2,"0")}:${String(draft.start%60).padStart(2,"0")}`} onChange={e => { const [h,m] = e.target.value.split(":").map(Number); setDraft({...draft, start: h*60+m}); }} /></div>
                  <div><Label>Min</Label><Input type="number" min={5} step={5} value={draft.duration} onChange={e => setDraft({...draft, duration: parseInt(e.target.value)||30})} /></div>
                </div>
                <div className="flex items-center justify-between p-3 rounded-xl bg-muted/40">
                  <div>
                    <div className="text-sm font-semibold flex items-center gap-2"><Bell className="w-4 h-4" /> Reminder</div>
                    <div className="text-xs text-muted-foreground">Notify {draft.reminder} min before start</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input type="number" className="w-16 h-8" min={0} max={120} value={draft.reminder} onChange={e => setDraft({...draft, reminder: parseInt(e.target.value)||0})} />
                    <Switch checked={draft.reminderOn} onCheckedChange={v => setDraft({...draft, reminderOn: v})} />
                  </div>
                </div>
                <Button onClick={createItem} className="w-full rounded-full">Add to planner</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Goal + chart row */}
        <div className="grid md:grid-cols-2 gap-4 mb-6">
          <Card className="glass-strong p-5 rounded-3xl">
            <div className="flex items-center gap-2 mb-2"><Target className="w-5 h-5 text-primary" /><h3 className="font-bold">Today's goal</h3></div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold">{todayMinutes}</span>
              <span className="text-muted-foreground">/ {goal} min</span>
            </div>
            <Progress value={goalPct} className="mt-2 h-3" />
            <div className="flex items-center gap-2 mt-3">
              <Label className="text-xs">Set goal:</Label>
              <Input type="number" min={10} step={10} value={goal} onChange={e => setGoal(parseInt(e.target.value)||60)} onBlur={e => saveGoal(parseInt(e.target.value)||60)} className="h-8 w-24" />
              <span className="text-xs text-muted-foreground">minutes</span>
            </div>
          </Card>
          <Card className="glass p-5 rounded-3xl">
            <h3 className="font-bold mb-2">Last 7 days · focus minutes</h3>
            <div className="h-36">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={history}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip cursor={{ opacity: 0.1 }} contentStyle={{ borderRadius: 12, fontSize: 12 }} />
                  <Bar dataKey="minutes" fill="var(--primary)" radius={[6,6,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>

        {/* Week navigator */}
        <div className="flex items-center justify-between mb-3">
          <Button variant="ghost" size="sm" onClick={() => { const d = new Date(weekStart); d.setDate(d.getDate()-7); setWeekStart(d); }}><ChevronLeft className="w-4 h-4" /></Button>
          <div className="font-semibold text-sm">{week[0].toLocaleDateString(undefined, { month: "short", day: "numeric" })} – {week[6].toLocaleDateString(undefined, { month: "short", day: "numeric" })}</div>
          <Button variant="ghost" size="sm" onClick={() => { const d = new Date(weekStart); d.setDate(d.getDate()+7); setWeekStart(d); }}><ChevronRight className="w-4 h-4" /></Button>
        </div>

        {/* Calendar grid */}
        <Card className="glass rounded-3xl p-2 overflow-x-auto">
          <div className="min-w-[760px]">
            <div className="grid" style={{ gridTemplateColumns: "60px repeat(7, 1fr)" }}>
              <div />
              {week.map(d => {
                const isToday = fmtDate(d) === fmtDate(new Date());
                return (
                  <div key={d.toISOString()} className={`text-center py-2 text-xs font-semibold ${isToday ? "text-primary" : "text-muted-foreground"}`}>
                    <div>{d.toLocaleDateString(undefined, { weekday: "short" })}</div>
                    <div className={`text-lg ${isToday ? "" : "text-foreground"}`}>{d.getDate()}</div>
                  </div>
                );
              })}
            </div>
            <div className="grid" style={{ gridTemplateColumns: "60px repeat(7, 1fr)" }}>
              {HOURS.map(h => (
                <FragmentRow key={h} h={h} week={week} items={items} onComplete={toggleComplete} onReminder={toggleReminder} onDelete={deleteItem} />
              ))}
            </div>
          </div>
        </Card>
      </DndContext>
    </AppShell>
  );
}

function Cell({ dateStr, hour, children }: { dateStr: string; hour: number; children: React.ReactNode }) {
  const { isOver, setNodeRef } = useDroppable({ id: `${dateStr}|${hour}` });
  return (
    <div ref={setNodeRef} className={`min-h-[56px] border-t border-l border-border/40 p-1 transition ${isOver ? "bg-primary/10" : ""}`}>
      {children}
    </div>
  );
}

function ItemCard({ item, onComplete, onReminder, onDelete }: { item: Item; onComplete: () => void; onReminder: () => void; onDelete: () => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: item.id });
  const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined;
  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`group relative rounded-lg p-1.5 mb-1 cursor-grab active:cursor-grabbing select-none text-[11px] ${isDragging ? "opacity-60" : ""} ${item.completed ? "bg-muted/60 line-through opacity-70" : "bg-gradient-to-br from-primary/90 to-cyan/90 text-primary-foreground shadow"}`}
    >
      <div className="font-bold leading-tight truncate">{item.title}</div>
      <div className="opacity-80 truncate">{minToLabel(item.start_minute)} · {item.duration_minutes}m</div>
      <div className="flex gap-0.5 absolute top-0.5 right-0.5 opacity-0 group-hover:opacity-100 transition">
        <button onPointerDown={e => e.stopPropagation()} onClick={onComplete} className="p-0.5 rounded bg-background/30 hover:bg-background/60" title="Done"><CheckCircle2 className="w-3 h-3" /></button>
        <button onPointerDown={e => e.stopPropagation()} onClick={onReminder} className="p-0.5 rounded bg-background/30 hover:bg-background/60" title="Reminder">{item.reminder_enabled ? <Bell className="w-3 h-3" /> : <BellOff className="w-3 h-3" />}</button>
        <button onPointerDown={e => e.stopPropagation()} onClick={onDelete} className="p-0.5 rounded bg-background/30 hover:bg-background/60" title="Delete"><Trash2 className="w-3 h-3" /></button>
      </div>
    </div>
  );
}

function FragmentRow({ h, week, items, onComplete, onReminder, onDelete }: { h: number; week: Date[]; items: Item[]; onComplete: (it: Item) => void; onReminder: (it: Item) => void; onDelete: (id: string) => void }) {
  return (
    <>
      <div className="text-[10px] text-muted-foreground text-right pr-2 pt-1 border-t border-border/40">{minToLabel(h*60)}</div>
      {week.map(d => (
        <Cell key={`${fmtDate(d)}-${h}`} dateStr={fmtDate(d)} hour={h}>
          {items.filter(i => i.scheduled_date === fmtDate(d) && Math.floor(i.start_minute/60) === h).map(i => (
            <ItemCard key={i.id} item={i} onComplete={() => onComplete(i)} onReminder={() => onReminder(i)} onDelete={() => onDelete(i.id)} />
          ))}
        </Cell>
      ))}
    </>
  );
}
