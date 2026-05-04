
-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL DEFAULT 'Student',
  avatar_url TEXT,
  class_level TEXT,
  board TEXT,
  bio TEXT,
  xp INTEGER NOT NULL DEFAULT 0,
  level INTEGER NOT NULL DEFAULT 1,
  current_streak INTEGER NOT NULL DEFAULT 0,
  longest_streak INTEGER NOT NULL DEFAULT 0,
  last_study_date DATE,
  total_focus_minutes INTEGER NOT NULL DEFAULT 0,
  is_online BOOLEAN NOT NULL DEFAULT false,
  onboarded BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Subjects user is studying
CREATE TABLE public.user_subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  current_chapter TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.user_subjects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "User subjects viewable by everyone" ON public.user_subjects FOR SELECT USING (true);
CREATE POLICY "Users manage own subjects" ON public.user_subjects FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Struggles - "I'm stuck on this chapter" signals
CREATE TABLE public.struggles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  chapter TEXT NOT NULL,
  class_level TEXT,
  message TEXT,
  resolved BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.struggles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Struggles viewable by everyone" ON public.struggles FOR SELECT USING (true);
CREATE POLICY "Users insert own struggles" ON public.struggles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own struggles" ON public.struggles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own struggles" ON public.struggles FOR DELETE USING (auth.uid() = user_id);

-- Study sessions (Pomodoro logs)
CREATE TABLE public.focus_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  subject TEXT,
  chapter TEXT,
  duration_minutes INTEGER NOT NULL,
  xp_earned INTEGER NOT NULL DEFAULT 0,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.focus_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own sessions" ON public.focus_sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own sessions" ON public.focus_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Badges earned
CREATE TABLE public.user_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  badge_code TEXT NOT NULL,
  earned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, badge_code)
);
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Badges viewable by everyone" ON public.user_badges FOR SELECT USING (true);
CREATE POLICY "Users insert own badges" ON public.user_badges FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1), 'Student'),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Award XP and update streak
CREATE OR REPLACE FUNCTION public.award_focus_xp()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  today DATE := CURRENT_DATE;
  last_date DATE;
  new_streak INTEGER;
BEGIN
  SELECT last_study_date INTO last_date FROM public.profiles WHERE id = NEW.user_id;
  IF last_date = today THEN
    new_streak := (SELECT current_streak FROM public.profiles WHERE id = NEW.user_id);
  ELSIF last_date = today - 1 THEN
    new_streak := (SELECT current_streak FROM public.profiles WHERE id = NEW.user_id) + 1;
  ELSE
    new_streak := 1;
  END IF;

  UPDATE public.profiles
  SET xp = xp + NEW.xp_earned,
      level = GREATEST(1, ((xp + NEW.xp_earned) / 100) + 1),
      total_focus_minutes = total_focus_minutes + NEW.duration_minutes,
      current_streak = new_streak,
      longest_streak = GREATEST(longest_streak, new_streak),
      last_study_date = today
  WHERE id = NEW.user_id;
  RETURN NEW;
END;
$$;
CREATE TRIGGER focus_session_xp AFTER INSERT ON public.focus_sessions
  FOR EACH ROW EXECUTE FUNCTION public.award_focus_xp();

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.struggles;
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
