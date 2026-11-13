import { useState } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { useTrips } from "@/lib/store"
import { decodeTripLink, parseTripImport } from "@/lib/tripImport"
import { parsePatch, previewPatch, type TripPatch } from "@/lib/tripPatch"
import { loadTrips } from "@/lib/store"
import type { Trip } from "@/lib/types"

export function TripImport() {
  const location = useLocation()
  const navigate = useNavigate()
  const { trips, addTrip, updateTrip } = useTrips()
  const [patchPreview, setPatchPreview] = useState<TripPatch | null>(null)
  const [raw, setRaw] = useState("")
  const [preview, setPreview] = useState<Trip | null>(null)
  const [error, setError] = useState("")
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const linked = location.hash.startsWith("#import=")
  let trip = preview
  let patch = patchPreview
  let linkError = ""
  if (linked) {
    try {
      const value = new URLSearchParams(location.hash.slice(1)).get("import") || ""
      if (value.length > 200000) throw new Error("Oversized import link")
      if (JSON.parse(value).version === 2) { patch = parsePatch(value); trip = null }
      else { trip = decodeTripLink(location.hash); patch = null }
    } catch (e) { linkError = e instanceof Error ? e.message : "Invalid link" }
  }
  const target = patch && trips.find(t => t.id === patch.tripId)
  let result: ReturnType<typeof previewPatch> | null = null
  if (patch) {
    try { if (!target) throw new Error("Existing trip not found"); result = previewPatch(target, patch) }
    catch (e) { linkError = e instanceof Error ? e.message : "Invalid update" }
  }
  function applyPatch() {
    if (!patch || !target || !result?.changed) return
    try {
      const latest = loadTrips().find(t => t.id === target.id)
      if (!latest || JSON.stringify(latest) !== JSON.stringify(target)) throw new Error("Trip changed in another tab. Reload and preview again.")
      localStorage.setItem("readysetroam.patch-backup." + target.id, JSON.stringify({ version: 1, trip: latest }))
      updateTrip(previewPatch(latest, patch).trip)
      close()
      navigate("/trip/" + target.id, { replace: true })
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to update") }
  }
  const duplicate = trip && trips.some(t => t.id === trip.id)
  function close() {
    setPatchPreview(null); setOpen(false); setPreview(null); setRaw(""); setError("")
    if (linked) navigate({ pathname: location.pathname, search: location.search, hash: "" }, { replace: true })
  }
  function save() {
    if (!trip || busy) return
    setBusy(true)
    try {
      const fresh = duplicate ? { ...trip, id: crypto.randomUUID() } : trip
      addTrip(fresh)
      setOpen(false); setPreview(null); setRaw(""); setError("")
      navigate("/trip/" + fresh.id, { replace: linked })
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to save")
    } finally { setBusy(false) }
  }
  return (
    <section className="mx-auto max-w-6xl px-4 py-4">
      {!open && !linked ? <Button variant="outline" onClick={() => setOpen(true)}>Import AI trip</Button> : (
        <div className="rounded-3xl border bg-card p-6 space-y-4">
          <h2 className="font-display text-2xl">Import from ChatGPT</h2>
          <p className="text-sm text-muted-foreground">Review before saving. Your trip stays in this browser.</p>
          {(error || linkError) && <p role="alert" className="text-red-700">{error || linkError}</p>}
          {!trip && !patch && !linked && <>
            <label className="block text-sm">Paste trip JSON
              <textarea className="block w-full border rounded-lg p-3" rows={5} value={raw} onChange={e => setRaw(e.target.value)} />
            </label>
            <label className="block text-sm">Or choose a trip JSON file
              <input className="block" type="file" accept=".json,application/json" onChange={async e => {
                const file = e.target.files?.[0]
                if (!file) return
                try { if (file.size > 500000) throw new Error("File too large"); setRaw(await file.text()); setError("") } catch (err) { setError(String(err)) }
              }} />
            </label>
            <Button onClick={() => { try { if (JSON.parse(raw).version === 2) { setPatchPreview(parsePatch(raw)); setPreview(null) } else { setPreview(parseTripImport(raw)); setPatchPreview(null) }; setError("") } catch (e) { setError(e instanceof Error ? e.message : "Invalid JSON") } }}>Preview trip</Button>
          </>}
          {patch && result && <>
            <h3 className="text-xl font-semibold">Update {target?.title}</h3>
            <ul className="list-disc pl-5 break-words">{result.messages.map((m,i) => <li key={i}>{m}</li>)}</ul>
            <p>Only listed stops will change. Existing bookings are protected. A local backup is saved before applying.</p>
            <Button disabled={!result.changed} onClick={applyPatch}>Apply updates to existing trip</Button>
            <Button variant="outline" disabled={!result.changed} onClick={() => { try { const copy = {...result!.trip, id: crypto.randomUUID()}; addTrip(copy); close(); navigate("/trip/" + copy.id) } catch (e) { setError(String(e)) } }}>Save as separate copy</Button>
          </>}
          {trip && <>
            <h3 className="text-xl font-semibold">{trip.title}</h3>
            <p>{trip.destination} · {trip.start} to {trip.end}</p>
            <p>{trip.party} · {trip.days.length} days · {trip.places.length} places · {trip.stays.length} stays</p>
            <ul className="list-disc pl-5">{trip.days.map(d => <li key={d.id}>{d.date}: {d.title} ({d.stops.length} stops)</li>)}</ul>
            {duplicate && <p role="alert">A trip with this ID already exists. Save a separate copy to protect your existing bookings and edits.</p>}
            <Button disabled={busy} onClick={save}>{duplicate ? "Save as separate copy" : "Add to my trips"}</Button>
          </>}
          <Button variant="outline" onClick={close}>Cancel</Button>
        </div>
      )}
    </section>
  )
}
