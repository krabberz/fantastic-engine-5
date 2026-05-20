# CLAUDE.md — Jollar Picks (fantastic-engine-5)

Sports betting / pick'em league platform for Jollarians. Users bet Jollars on sports picks and enter pick'em leagues. Built with React + Vite. Part of the Jollarian Federation ecosystem.

---

## Stack

- **Framework:** React 18 + Vite
- **Routing:** React Router v6
- **Auth & DB:** Supabase i-pick project (`veskcncrtjngnuxnglxg`)
- **Styling:** CSS Modules + global CSS variables
- **Payments:** JCB API (`https://jcb.jollaria.org`) — called directly from client
- **Dev:** `npm run dev` (port 5173)

---

## Project layout

```
src/
  pages/
    Home, About, Picks, Leagues, LeagueDetail,
    Dashboard, Auth, Signup, ResetPassword, Admin
  components/     — Nav, Footer
  context/        — AuthContext (user, profile, account balance)
  lib/
    supabase.js   — Supabase client (anon key)
  styles/
    globals.css   — CSS variables, shared styles
supabase/
  functions/
    payout-win/   — Pay out winning bets via JCB account transfer
    settle-league/ — Score and settle a league, pay top finishers
  migrations/     — SQL migrations (apply in Supabase SQL editor)
```

---

## Environment variables (`.env`)

```
VITE_IPICK_URL=https://veskcncrtjngnuxnglxg.supabase.co
VITE_IPICK_KEY=sb_publishable_K0R7FI1IkbGhFyJJ1k8X_A_szGSA2JU   # safe to expose (publishable)
VITE_JCB_URL=https://jcb.jollaria.org
VITE_JCB_KEY=<jpix jcb api key>   # client-exposed, accepted risk
VITE_JPIX_JCB_ACCOUNT=JCB-1123383096
```

---

## JCB API (called directly from React client)

**Base URL:** `VITE_JCB_URL`
**Auth:** `Authorization: Bearer VITE_JCB_KEY`
**JPIX account:** `VITE_JPIX_JCB_ACCOUNT` = `JCB-1123383096`

CORS is `*` — direct browser calls work.

| Endpoint | Purpose |
|----------|---------|
| `POST /api/v1/cards/validate` | Validate card; returns `{ ok, data: { valid, account_number, ... } }` |
| `POST /api/v1/cards/charge` | Charge card; `transaction_type: 'purchase'` for bets/entry fees |
| `POST /api/v1/accounts/{account_number}` | Fetch balance/owner info |
| `POST /api/v1/transactions` | Account-to-account transfer (used by Edge Functions for payouts) |

**`safeJson` helper** — always check `content-type: application/json` before `.json()`; HTML responses mean an undefined URL hit the SPA.

---

## Database (i-pick: `veskcncrtjngnuxnglxg`)

### `picks`
```sql
id, sport, matchup, teams,
team1, team1_odds,           -- individual team name + moneyline (e.g. "-205")
team2, team2_odds,           -- second team + moneyline
spread,                      -- over/under line (text, e.g. "224.5")
odds,                        -- legacy: = team1_odds
game_time, confidence, is_hot,
result,                      -- null | 'win' | 'loss' | 'push'
created_at
```

`matchup` and `teams` are auto-generated from `team1 vs team2` when saving via Admin.

### `user_bets`
```sql
id, user_id, pick_id, amount, jcb_transaction_ref,
result, payout, created_at
```
Minimum bet: **Ɉ4**. Amounts are whole Jollars only (`Math.round()`).

### `leagues`
```sql
id, name, description,
entry_fee,                   -- minimum Ɉ10
rake,                        -- fixed Ɉ1 per entry
payout_split,                -- '40/30/30' | '33/33/33' | custom e.g. '35/25/25/15'
entry_count, pot_total,      -- maintained by DB trigger
status,                      -- 'open' | 'locked' | 'settled'
closes_at, settled_at, created_at
```

`payout_split` can have 3 or 4 parts. Each part is a whole-number percentage. Parts can sum to < 100 (house keeps remainder).

### `league_entries`
```sql
id, league_id, user_id,
predictions,                 -- JSONB: { [pick_id]: 'team1' | 'team2' | 'tie' }
score, rank, payout,
jcb_transaction_ref, created_at
```

### `league_picks`
```sql
league_id, pick_id
```

---

## Pick'em League system

- Admin creates a league, selects pending picks, sets entry fee (min Ɉ10), payout split
- Rake is **Ɉ1 fixed** per entry; prize pool = `(entry_fee - 1) × entry_count`
- Users predict which team wins each pick (`team1` | `team2` | `tie` for applicable sports)
- Tie/Draw shown for: Soccer, EPL, MLS, Bundesliga, NCAAF
- After all picks are settled, admin locks → settles league via `settle-league` Edge Function
- **Payout split** editable on locked leagues before settling
- Top N finishers (N = number of split parts) paid via JCB account transfer to card's linked account
- Scoring: `win` result → `team1` correct; `loss` → `team2` correct; `push` → `tie` correct

---

## Betting (individual picks)

- Min Ɉ4, whole Jollars only
- Charge: `POST /api/v1/cards/charge` with `transaction_type: 'purchase'`
- Win payout: `payout-win` Edge Function → `POST /api/v1/transactions` (JPIX → winner account)
- Multiplier: 2× bet amount

---

## Edge Functions

Both deployed with `--no-verify-jwt` (publishable key is not a JWT).

| Function | Trigger | Notes |
|----------|---------|-------|
| `payout-win` | Admin settles pick as 'win' | Pays all bettors 2× via account transfer |
| `settle-league` | Admin settles locked league | Scores entries, pays top N finishers |

**Secrets required:**
```
JCB_API_URL, JCB_API_KEY, JPIX_JCB_ACCOUNT
SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY  (auto-injected)
```

Deploy:
```bash
npx supabase functions deploy payout-win --project-ref veskcncrtjngnuxnglxg --no-verify-jwt
npx supabase functions deploy settle-league --project-ref veskcncrtjngnuxnglxg --no-verify-jwt
```

---

## Currency

All amounts are **whole Jollars** — always use `Math.round()`. Display as `Ɉ{amount}` (no decimals). ASCII fallback: `J`.

---

## Auth

- Single Supabase project for both auth and DB (`veskcncrtjngnuxnglxg`)
- Admin roles: `admin` or `superadmin` — both access the Admin page
- Payment methods (JCB card) added in Dashboard, not at signup
- Card validation: `POST /api/v1/cards/validate` → save `jcb_card_number` + `jcb_account_number` to `profiles`

---

## Design system

Gold/black theme. CSS variables in `globals.css`:
- `--gold` `#C9A84C`, `--gold-light` `#F0D080`, `--gold-dark` `#8B6914`
- `--black` `#080808` through `--black-4` `#1E1E1E`
- `--white` `#F5F0E8`, `--grey` `#888880`
- Fonts: **Bebas Neue** (headings), **Barlow Condensed** (labels/UI), **Barlow** (body)
- Buttons: `clip-path: polygon(10px 0%, 100% 0%, calc(100% - 10px) 100%, 0% 100%)`

---

## DB migrations

Apply SQL files in `supabase/migrations/` via **Supabase Dashboard → project veskcncrtjngnuxnglxg → SQL Editor**.

Latest pending:
- `20260518_leagues_payout_split.sql` — adds `payout_split` to leagues
- `20260519_picks_team_fields.sql` — adds `team1`, `team1_odds`, `team2`, `team2_odds`, `spread` to picks
