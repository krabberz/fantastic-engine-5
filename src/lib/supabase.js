import { createClient } from '@supabase/supabase-js'

// Jollarian Federation — handles login/auth and bank account lookups
export const supabaseAuth = createClient(
  import.meta.env.VITE_JOLLARIA_URL,
  import.meta.env.VITE_JOLLARIA_ANON_KEY
)

// i pick — handles picks, bets, and results
export const supabaseIpick = createClient(
  import.meta.env.VITE_IPICK_URL,
  import.meta.env.VITE_IPICK_KEY
)
