ALTER TABLE public.user_bets
  ADD COLUMN IF NOT EXISTS prediction text;
