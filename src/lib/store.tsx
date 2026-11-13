import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react"
import { seedTripById, seedTrips } from "@/data/seed"
import { supabase } from "@/lib/supabase"
import { validateTrip } from "@/lib/tripImport"
import type { CloudTrip } from "@/lib/cloudTrips"
import type { Trip } from "@/lib/types"

const STORAGE_KEY = "readysetroam.trips.v2"

function clone<T>(value: T): T {
  return structuredClone(value)
}

export function loadTrips(): Trip[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return clone(seedTrips)
    const parsed = JSON.parse(raw) as { trips?: Trip[] }
    if (!Array.isArray(parsed.trips)) return clone(seedTrips)
    const saved = new Map(parsed.trips.map((trip) => [trip.id, trip]))
    const merged = seedTrips.map((seed) => saved.get(seed.id) ?? clone(seed))
    for (const trip of parsed.trips) {
      if (!seedTrips.some((seed) => seed.id === trip.id)) merged.push(trip)
    }
    return merged
  } catch {
    return clone(seedTrips)
  }
}

export function isPublishedTrip(id: string) {
  return seedTrips.some((trip) => trip.id === id)
}

type TripStore = {
  trips: Trip[]
  localTrips: Trip[]
  cloud: boolean
  busy: boolean
  status: string
  refresh: () => Promise<void>
  updateTrip: (trip: Trip) => Promise<void>
  addTrip: (trip: Trip) => Promise<void>
  removeTrip: (id: string) => Promise<void>
  resetTrip: (id: string) => Promise<void>
}

const TripContext = createContext<TripStore | null>(null)

export function TripsProvider({ children }: { children: ReactNode }) {
  const [localTrips, setLocal] = useState(loadTrips)
  const [rows, setRows] = useState<CloudTrip[]>([])
  const [user, setUser] = useState<string | null>(null)
  const [ready, setReady] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState("Checking account…")
  const account = useRef<string | null>(null)
  const lock = useRef(false)
  const epoch = useRef(0)
  const latestRows = useRef<CloudTrip[]>([])
  const latestLocal = useRef(localTrips)
  const initialized = useRef(false)
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const next = session?.user.id ?? null
      if (!initialized.current || account.current !== next) {
        initialized.current = true
        account.current = next
        epoch.current++
        latestRows.current = []
        setRows([])
        setLoaded(false)
        setUser(next)
        setReady(true)
        setStatus(next ? "Loading cloud trips…" : "Local trips only")
      }
    })
    return () => subscription.unsubscribe()
  }, [])
  function replaceRows(next: CloudTrip[]) {
    latestRows.current = next
    setRows(next)
  }
  async function refresh() {
    const id = account.current
    if (!id || lock.current) return
    const generation = epoch.current
    lock.current = true; setBusy(true)
    try {
      const { data, error } = await supabase.from("trips").select("id,data,version,updated_at").eq("owner_id", id)
      if (error) throw error
      if (epoch.current !== generation) return
      replaceRows((data ?? []).map(row => ({ ...row, data: validateTrip(row.data) })))
      setLoaded(true); setStatus("Cloud trips up to date")
    } catch (e) {
      if (epoch.current === generation) setStatus("Cloud load failed: " + errorText(e))
    } finally { lock.current = false; setBusy(false) }
  }
  useEffect(() => {
    if (user && !busy && !loaded && status === "Loading cloud trips…") void refresh()
  }, [user, busy, loaded, status])
  function persist(next: Trip[]) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ trips: next }))
    latestLocal.current = next
    setLocal(next)
  }
  async function write(kind: "add" | "update" | "delete", trip: Trip | string) {
    if (!ready || lock.current) throw new Error("Please wait for the current cloud operation")
    const id = typeof trip === "string" ? trip : trip.id
    const owner = account.current
    if (!owner) {
      const current = latestLocal.current
      if (kind === "add" && current.some(t => t.id === id)) throw new Error("Trip already exists")
      persist(kind === "delete" ? current.filter(t => t.id !== id) : kind === "add" ? [...current, trip as Trip] : current.map(t => t.id === id ? trip as Trip : t))
      return
    }
    if (!loaded) throw new Error("Load cloud trips before editing")
    const generation = epoch.current
    const old = latestRows.current.find(row => row.id === id)
    if (kind !== "add" && !old) throw new Error("Cloud trip not found")
    if (kind === "add" && old) throw new Error("Trip already exists")
    lock.current = true; setBusy(true); setStatus("Saving to cloud…")
    try {
      const table = supabase.from("trips")
      const query = kind === "add"
        ? table.insert({ owner_id: owner, id, data: validateTrip(trip) })
        : kind === "update"
          ? table.update({ data: validateTrip(trip) }).eq("owner_id", owner).eq("id", id).eq("version", old!.version)
          : table.delete().eq("owner_id", owner).eq("id", id).eq("version", old!.version)
      const { data, error } = await query.select("id,data,version,updated_at")
      if (error) throw error
      if (data?.length !== 1) throw new Error("Trip changed on another device. Refresh cloud trips before retrying.")
      if (epoch.current !== generation) throw new Error("Account changed during save")
      replaceRows(kind === "delete" ? latestRows.current.filter(row => row.id !== id) : [...latestRows.current.filter(row => row.id !== id), { ...data[0], data: validateTrip(data[0].data) }])
      setStatus("All changes saved to cloud")
    } catch (e) {
      if (epoch.current === generation) setStatus("Save failed: " + errorText(e))
      // Keep a recoverable draft without mixing it into the local trip list.
      if (kind !== "delete") {
        try { localStorage.setItem("readysetroam.failed-cloud-save." + owner + "." + id, JSON.stringify(trip)) } catch { /* storage may be unavailable */ }
      }
      throw e
    } finally { lock.current = false; setBusy(false) }
  }
  const store: TripStore = {
    trips: !ready ? [] : user ? rows.map(row => row.data) : localTrips,
    localTrips, cloud: !!user, busy: busy || !ready || (!!user && !loaded), status, refresh,
    updateTrip: trip => write("update", trip),
    addTrip: trip => write("add", trip),
    removeTrip: id => write("delete", id),
    resetTrip: id => { const seed = seedTripById(id); return seed ? write("update", clone(seed)) : write("delete", id) },
  }
  return <TripContext.Provider value={store}>{children}</TripContext.Provider>
}
function errorText(e: unknown) {
  return String((e as { message?: string })?.message ?? e)
}
export function useTrips() {
  const store = useContext(TripContext)
  if (!store) throw new Error("useTrips must be used inside TripsProvider")
  return store
}
