import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { useTrips } from "@/lib/store"
import { listCloudTrips, createCloudTrip, type CloudTrip } from "@/lib/cloudTrips"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"

export function CloudTripsPanel() {
  const { trips, addTrip } = useTrips()
  const [user, setUser] = useState<string | null>(null)
  const [rows, setRows] = useState<CloudTrip[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user.id ?? null)
      setRows([])
    })
    return () => subscription.unsubscribe()
  }, [])
  useEffect(() => {
    if (!user) return
    let active = true
    listCloudTrips().then(data => { if (active) setRows(data) })
      .catch(e => { if (active) setError(String(e.message ?? e)) })
    return () => { active = false }
  }, [user])
  async function refresh() {
    setRows(await listCloudTrips())
  }
  async function upload(id: string) {
    const trip = trips.find(t => t.id === id)
    if (!trip || !window.confirm("Upload this trip, including private booking details, to your account?")) return
    setBusy(true); setError("")
    try { await createCloudTrip(trip); await refresh(); toast.success("Cloud copy created") }
    catch (e) { setError(e instanceof Error ? e.message : String((e as {message?: string}).message ?? e)) }
    finally { setBusy(false) }
  }
  if (!user) return null
  return <section className="mt-8 rounded-2xl border bg-card p-4">
    <h2 className="text-xl">Cloud trip copies</h2>
    <p className="text-sm text-muted-foreground">Migration preview. Upload a private copy explicitly. Local edits do not sync yet.</p>
    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    <div className="mt-3 space-y-2">
      {trips.map(t => <div key={t.id} className="flex items-center justify-between gap-2">
        <span>{t.title}</span>
        <Button size="sm" variant="outline" disabled={busy || rows.some(r => r.id === t.id)} onClick={() => upload(t.id)}>
          {rows.some(r => r.id === t.id) ? "Cloud copy exists" : "Upload private copy"}
        </Button>
      </div>)}
    </div>
    <h3 className="mt-4 font-medium">Cloud copies</h3>
    {rows.map(r => <div key={r.id} className="flex items-center justify-between gap-2 py-2">
      <span>{r.data.title} · v{r.version}</span>
      <Button size="sm" variant="outline" disabled={busy || trips.some(t => t.id === r.id)} onClick={() => {
        if (trips.some(t => t.id === r.id)) return
        addTrip(r.data); toast.success("Local copy restored")
      }}> {trips.some(t => t.id === r.id) ? "Local ID exists" : "Restore local copy"} </Button>
    </div>)}
    <Button className="mt-3" variant="outline" disabled={busy} onClick={() => {
      setBusy(true); setError("")
      refresh().catch(e => setError(String(e.message ?? e))).finally(() => setBusy(false))
    }}>Refresh cloud copies</Button>
  </section>
}
