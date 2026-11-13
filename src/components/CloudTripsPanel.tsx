import { useEffect, useRef, useState } from "react"
import { supabase } from "@/lib/supabase"
import { useTrips } from "@/lib/store"
import { listCloudTrips, type CloudTrip } from "@/lib/cloudTrips"
import { Button } from "@/components/ui/button"
import { validateTrip } from "@/lib/tripImport"

function canonical(value: unknown): string {
  if (Array.isArray(value)) return "[" + value.map(canonical).join(",") + "]"
  if (value !== null && typeof value === "object") {
    const obj = value as Record<string, unknown>
    return "{" + Object.keys(obj).filter(k => obj[k] !== undefined).sort().map(k => JSON.stringify(k) + ":" + canonical(obj[k])).join(",") + "}"
  }
  return JSON.stringify(value) ?? "null"
}

export function CloudTripsPanel() {
  const { localTrips: trips, refresh: refreshStore, busy: storeBusy } = useTrips()
  const [user, setUser] = useState<string | null>(null)
  const [rows, setRows] = useState<CloudTrip[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const [report, setReport] = useState<string[]>([])
  const account = useRef<string | null>(null)
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const next = session?.user.id ?? null
      if (account.current !== next) {
        account.current = next
        setRows([])
        setReport([])
        setError("")
        setUser(next)
      }
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
  async function migrateAll() {
    if (!user || busy || storeBusy) return
    const ownerId = user
    if (!window.confirm("Upload all " + trips.length + " local trips, including private booking details, to your signed-in account? Existing cloud copies will not be overwritten. Local trips will remain unchanged.")) return
    setBusy(true); setError(""); setReport([])
    const results: string[] = []
    try {
      const existing = await listCloudTrips()
      if (account.current !== ownerId) return
      for (const trip of trips) {
        if (account.current !== ownerId) break
        const found = existing.find(row => row.id === trip.id)
        if (found) {
          results.push(trip.title + (canonical(found.data) === canonical(trip) ? ": already identical" : ": conflict — both copies preserved"))
        } else {
          try {
            // Bind every insert to the account that confirmed the migration.
            // RLS rejects the insert if the session changes.
            const { error: insertError } = await supabase.from("trips").insert({ owner_id: ownerId, id: trip.id, data: validateTrip(trip) })
            if (insertError) throw insertError
            results.push(trip.title + ": uploaded")
          } catch (e) {
            results.push(trip.title + ": not uploaded — " + String((e as {message?: string}).message ?? e))
          }
        }
        if (account.current === ownerId) setReport([...results])
      }
      if (account.current === ownerId) {
        const latest = await listCloudTrips()
        if (account.current === ownerId) { setRows(latest); await refreshStore() }
      }
    } catch (e) {
      if (account.current === ownerId) setError(String((e as {message?: string}).message ?? e))
    } finally { setBusy(false) }
  }
  if (!user) return null
  return <details className="mt-8 rounded-2xl border bg-card p-4">
    <summary className="cursor-pointer font-medium">Local trip backups and migration</summary>
    <p className="text-sm text-muted-foreground">Your main trip list now uses cloud storage. Local backups are retained and never overwrite cloud trips automatically.</p>
    <Button className="mt-3" disabled={busy || storeBusy || trips.length === 0} onClick={migrateAll}>{busy ? "Working…" : "Migrate all trips to cloud"}</Button>
    {report.length > 0 && <ul aria-live="polite" className="mt-3 list-disc pl-5 text-sm">{report.map((line, i) => <li key={i}>{line}</li>)}</ul>}
    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    <div className="mt-3 space-y-2">{trips.map(t => <div key={t.id} className="flex justify-between gap-2"><span>{t.title}</span><span>{rows.some(r => r.id === t.id) ? "Cloud copy exists" : "Local backup"}</span></div>)}</div>
  </details>
}
