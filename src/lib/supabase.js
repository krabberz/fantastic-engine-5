import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  import.meta.env.VITE_IPICK_URL,
  import.meta.env.VITE_IPICK_KEY,
)
