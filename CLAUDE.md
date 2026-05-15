# CLAUDE.md — Jollar Picks (fantastic-engine-5)

Sports betting / predictions platform for Jollarians. Users bet Jollars on sports picks. Built with React + Vite. Part of the Jollarian Federation ecosystem.

---

## Stack

- **Framework:** React 18 + Vite
- **Routing:** React Router v6
- **Auth & DB:** Supabase (`@supabase/supabase-js`)
- **Styling:** CSS Modules + global CSS variables
- **Dev:** `npm run dev` (port 5173)

---

## Project layout

```
src/
  pages/          — Home, About, Picks, Dashboard, Auth
  components/     — Nav, Footer (shared across all pages)
  context/        — AuthContext (login state, profile, bank account)
  lib/
    supabase.js   — Two Supabase clients (supabaseAuth + supabaseIpick)
    jcb.js        — JCB API helpers (validateCard, chargeCard, getAccount)
  styles/
    globals.css   — CSS variables, shared styles, animations
```

---

## Databases

### Jollarian Federation (`uazisatrosbxanporzwm`)
Used for **auth only**. Login with Jollarian Federation email/password via `supabaseAuth`.

Key tables read:
- `profiles` — `full_name`, `display_name`, `email`, `role`
- `bank_accounts` — `account_number`, `balance`, `account_type`, `is_frozen`

### i pick (`veskcncrtjngnuxnglxg`)
Used for **picks and bets data** via `supabaseIpick`.

Expected schema (create these if they don't exist):

```sql
create table picks (
  id uuid primary key default gen_random_uuid(),
  sport text not null,
  matchup text not null,       -- e.g. "Spurs -205"
  teams text not null,          -- e.g. "San Antonio vs Minnesota"
  odds text,                    -- e.g. "-205"
  game_time timestamptz not null,
  confidence int not null,      -- 0-100
  is_hot bool default false,
  result text,                  -- null | 'win' | 'loss' | 'push'
  created_at timestamptz default now()
);

create table user_bets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,        -- Jollarian Federation user ID
  pick_id uuid references picks(id),
  amount numeric not null,
  jcb_transaction_ref text,     -- JCB reference from charge response
  result text,                  -- null | 'win' | 'loss' | 'push'
  payout numeric,
  created_at timestamptz default now()
);
```

---

## JCB API

**Base URL:** `https://jcb.jollaria.org`
**Key prefix:** `jcb_live_407fd5e` (Jollar Picks key, permissions: accounts:read, cards:read, cards:charge, transactions:read/write/reverse)

The full API key goes in `.env` as `VITE_JCB_API_KEY`. Never commit the actual key.

---

## Auth flow

1. User logs in at `/login` with Jollarian Federation credentials
2. `AuthContext` calls `supabaseAuth.auth.signInWithPassword`
3. On success, loads their `profiles` row and `bank_accounts` (checking) from the Federation DB
4. All pages that need auth check `user` from `useAuth()` — Dashboard redirects to `/login` if not logged in
5. New users must apply at the National Bank of Jollaria first (Google Form link on login page)

---

## Currency display

Always format as `Ɉ{amount}` (e.g. `Ɉ25.00`). Use `J` as ASCII fallback in plain text contexts.

## Design system

Gold/black theme. CSS variables in `globals.css`:
- `--gold` `#C9A84C`, `--gold-light` `#F0D080`, `--gold-dark` `#8B6914`
- `--black` `#080808` through `--black-4` `#1E1E1E`
- `--white` `#F5F0E8`, `--grey` `#888880`
- Fonts: **Bebas Neue** (headings), **Barlow Condensed** (labels/UI), **Barlow** (body)
- Buttons use `clip-path: polygon(10px 0%, 100% 0%, calc(100% - 10px) 100%, 0% 100%)` for the angled look

## Notes

- `.env` is gitignored — never commit it. See `.env.example` for required vars.
- `VITE_JCB_API_KEY` needs to be filled in with the full Jollar Picks JCB key (prefix `jcb_live_407fd5e`).
- The i-pick DB (`veskcncrtjngnuxnglxg`) may need its `picks` and `user_bets` tables created — see schema above.
- MCP server for i-pick is configured in `.mcp.json` but requires authentication via `/mcp` in a Claude Code session opened from this directory.
