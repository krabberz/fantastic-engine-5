ALTER TABLE public.leagues
  ADD COLUMN IF NOT EXISTS payout_split text NOT NULL DEFAULT '40/30/30';
