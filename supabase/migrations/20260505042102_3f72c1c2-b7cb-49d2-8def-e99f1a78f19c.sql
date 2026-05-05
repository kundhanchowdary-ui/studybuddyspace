
-- Planner items (study sessions/tasks)
CREATE TABLE public.planner_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  subject TEXT,
  chapter TEXT,
  scheduled_date DATE NOT NULL,
  start_minute INTEGER NOT NULL DEFAULT 540, -- minutes from midnight (9:00 AM default)
  duration_minutes INTEGER NOT NULL DEFAULT 30,
  reminder_minutes_before INTEGER NOT NULL DEFAULT 10,
  reminder_enabled BOOLEAN NOT NULL DEFAULT true,
  completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.planner_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own planner" ON public.planner_items FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own planner" ON public.planner_items FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own planner" ON public.planner_items FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own planner" ON public.planner_items FOR DELETE USING (auth.uid() = user_id);
CREATE TRIGGER planner_items_updated_at BEFORE UPDATE ON public.planner_items FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX idx_planner_user_date ON public.planner_items(user_id, scheduled_date);

-- Daily goals
CREATE TABLE public.daily_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  goal_date DATE NOT NULL,
  target_minutes INTEGER NOT NULL DEFAULT 60,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, goal_date)
);
ALTER TABLE public.daily_goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own goals" ON public.daily_goals FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users manage own goals" ON public.daily_goals FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER daily_goals_updated_at BEFORE UPDATE ON public.daily_goals FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Solved doubts history
CREATE TABLE public.solved_doubts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  has_image BOOLEAN NOT NULL DEFAULT false,
  subject TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.solved_doubts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own doubts" ON public.solved_doubts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own doubts" ON public.solved_doubts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own doubts" ON public.solved_doubts FOR DELETE USING (auth.uid() = user_id);
CREATE INDEX idx_doubts_user_created ON public.solved_doubts(user_id, created_at DESC);
