import { createContext, useContext, useMemo, useState, type ReactNode } from "react"
import { seedTripById, seedTrips } from "@/data/seed"
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
  updateTrip: (trip: Trip) => void
  addTrip: (trip: Trip) => void
  removeTrip: (id: string) => void
  resetTrip: (id: string) => void
}

const TripContext = createContext<TripStore | null>(null)

export function TripsProvider({ children }: { children: ReactNode }) {
  const [trips, setTrips] = useState<Trip[]>(() => loadTrips())

  const store = useMemo<TripStore>(() => {
    const persist = (next: Trip[]) => {
      setTrips(next)
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ trips: next }))
    }
    return {
      trips,
      updateTrip: (trip) => persist(trips.map((item) => (item.id === trip.id ? trip : item))),
      addTrip: (trip) => persist([...trips, trip]),
      removeTrip: (id) => persist(trips.filter((trip) => trip.id !== id)),
      resetTrip: (id) => {
        const seed = seedTripById(id)
        if (!seed) {
          persist(trips.filter((trip) => trip.id !== id))
          return
        }
        persist(trips.map((trip) => (trip.id === id ? clone(seed) : trip)))
      },
    }
  }, [trips])

  return <TripContext.Provider value={store}>{children}</TripContext.Provider>
}

export function useTrips() {
  const store = useContext(TripContext)
  if (!store) throw new Error("useTrips must be used inside TripsProvider")
  return store
}
