ALTER TABLE public.picks
  ADD COLUMN IF NOT EXISTS team1       text,
  ADD COLUMN IF NOT EXISTS team1_odds  text,
  ADD COLUMN IF NOT EXISTS team2       text,
  ADD COLUMN IF NOT EXISTS team2_odds  text,
  ADD COLUMN IF NOT EXISTS spread      text;
