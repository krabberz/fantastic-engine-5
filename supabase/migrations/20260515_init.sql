-- Run this in the Supabase SQL editor for project veskcncrtjngnuxnglxg
-- supabase.com → veskcncrtjngnuxnglxg → SQL Editor → New query → paste → Run

create table if not exists picks (
  id uuid primary key default gen_random_uuid(),
  sport text not null,
  matchup text not null,       -- e.g. "Spurs -205"
  teams text not null,          -- e.g. "San Antonio vs Minnesota"
  odds text,                    -- e.g. "-205"
  game_time timestamptz not null,
  confidence int not null check (confidence between 0 and 100),
  is_hot bool not null default false,
  result text check (result in ('win', 'loss', 'push')),
  created_at timestamptz not null default now()
);

create table if not exists user_bets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,               -- Jollarian Federation user ID (auth.uid())
  pick_id uuid not null references picks(id) on delete cascade,
  amount numeric(12,2) not null check (amount > 0),
  jcb_transaction_ref text unique,     -- reference from POST /cards/charge
  result text check (result in ('win', 'loss', 'push')),
  payout numeric(12,2),                -- populated on win by admin/edge function
  created_at timestamptz not null default now()
);

create index if not exists idx_picks_game_time on picks(game_time);
create index if not exists idx_picks_result on picks(result) where result is null;
create index if not exists idx_user_bets_user_id on user_bets(user_id);
create index if not exists idx_user_bets_pick_id on user_bets(pick_id);

-- Row Level Security
alter table picks enable row level security;
alter table user_bets enable row level security;

-- Anyone (authenticated or anon) can read picks
create policy "picks_public_read"
  on picks for select using (true);

-- Only service role can insert/update/delete picks (admin adds them)
-- (service role bypasses RLS automatically — no policy needed)

-- Users can only see their own bets
create policy "user_bets_own_read"
  on user_bets for select
  using (auth.uid() = user_id);

-- Users can insert their own bets (Edge Function handles this server-side)
-- The edge function uses service role so it bypasses RLS — no insert policy needed for anon
