import { createClient } from "@supabase/supabase-js"

export const supabase = createClient(
  "https://gkqudeaqqazxxdravftl.supabase.co",
  "sb_publishable_tpoBiFK2BTKX589X04bkPg_pK6ehaNs",
  { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } },
)
