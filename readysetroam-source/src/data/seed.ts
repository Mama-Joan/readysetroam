import { hokkaidoTrip } from "@/data/hokkaido"
import { ipohTrip } from "@/data/ipoh"
import { nzTrip } from "@/data/nz"
import type { Trip } from "@/lib/types"

export const seedTrips: Trip[] = [hokkaidoTrip, nzTrip, ipohTrip]

for (const trip of seedTrips) {
  const ids = new Set(trip.places.map((place) => place.id))
  for (const day of trip.days) {
    for (const stop of day.stops) {
      if (stop.placeId && !ids.has(stop.placeId)) {
        throw new Error(`${trip.id} ${stop.id} is missing place ${stop.placeId}`)
      }
    }
  }
  for (const stay of trip.stays) {
    if (stay.placeId && !ids.has(stay.placeId)) {
      throw new Error(`${trip.id} ${stay.id} is missing place ${stay.placeId}`)
    }
  }
}

export function seedTripById(id: string) {
  return seedTrips.find((trip) => trip.id === id)
}
