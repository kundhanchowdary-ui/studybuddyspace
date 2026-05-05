import { useEffect, useRef } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Item = {
  id: string;
  title: string;
  subject: string | null;
  scheduled_date: string;
  start_minute: number;
  reminder_minutes_before: number;
  reminder_enabled: boolean;
  completed: boolean;
};

function dateAt(dateStr: string, minutes: number) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(y, m - 1, d, 0, 0, 0, 0);
  dt.setMinutes(minutes);
  return dt;
}

export function RemindersWatcher() {
  const { user } = useAuth();
  const fired = useRef<Set<string>>(new Set());
  const itemsRef = useRef<Item[]>([]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    async function load() {
      const today = new Date();
      const start = new Date(today.getFullYear(), today.getMonth(), today.getDate())
        .toISOString().slice(0, 10);
      const end = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 2)
        .toISOString().slice(0, 10);
      const { data } = await supabase
        .from("planner_items")
        .select("id,title,subject,scheduled_date,start_minute,reminder_minutes_before,reminder_enabled,completed")
        .gte("scheduled_date", start)
        .lte("scheduled_date", end);
      if (!cancelled) itemsRef.current = (data as Item[]) || [];
    }
    load();
    const reload = setInterval(load, 60_000);

    const tick = setInterval(() => {
      const now = Date.now();
      for (const it of itemsRef.current) {
        if (!it.reminder_enabled || it.completed) continue;
        const fireAt = dateAt(it.scheduled_date, it.start_minute - it.reminder_minutes_before).getTime();
        const startAt = dateAt(it.scheduled_date, it.start_minute).getTime();
        if (now >= fireAt && now <= startAt + 30_000 && !fired.current.has(it.id)) {
          fired.current.add(it.id);
          const mins = Math.max(0, Math.round((startAt - now) / 60000));
          const body = mins === 0 ? "Starting now" : `Starts in ${mins} min`;
          toast(`⏰ ${it.title}`, { description: `${it.subject ? it.subject + " · " : ""}${body}`, duration: 10000 });
          if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
            try { new Notification(`⏰ ${it.title}`, { body }); } catch {}
          }
        }
      }
    }, 20_000);

    return () => { cancelled = true; clearInterval(tick); clearInterval(reload); };
  }, [user]);

  return null;
}

export async function ensureNotificationPermission(): Promise<boolean> {
  if (typeof window === "undefined" || !("Notification" in window)) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  const res = await Notification.requestPermission();
  return res === "granted";
}
