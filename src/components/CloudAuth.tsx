import { useEffect, useState } from "react"
import type { Session } from "@supabase/supabase-js"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"

export function CloudAuth() {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    let active = true
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, next) => {
      if (active) { setSession(next); setLoading(false) }
    })
    return () => { active = false; subscription.unsubscribe() }
  }, [])
  async function signIn() {
    const redirectTo = new URL(import.meta.env.BASE_URL, window.location.origin).href
    const { error } = await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo } })
    if (error) toast.error(error.message)
  }
  async function signOut() {
    const { error } = await supabase.auth.signOut()
    if (error) toast.error(error.message)
  }
  if (loading) return <span className="text-xs">Checking sign-in…</span>
  return <div className="flex flex-wrap items-center gap-2">
    {session ? <>
      <span className="text-xs">{session.user.email}</span>
      <Button variant="outline" size="sm" onClick={signOut}>Sign out</Button>
    </> : <Button variant="outline" size="sm" onClick={signIn}>Sign in with Google</Button>}
    <span className="text-xs text-muted-foreground">Trips still stored locally</span>
  </div>
}
