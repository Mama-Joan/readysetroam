import { addDays } from "@/lib/format"
import type { Stay, Trip } from "@/lib/types"

export function tripNights(trip: Trip) {
  if (!trip.start || !trip.end || trip.start >= trip.end) return []
  const nights: string[] = []
  let cursor = trip.start
  let guard = 0
  while (cursor < trip.end && guard < 40) {
    nights.push(cursor)
    cursor = addDays(cursor, 1)
    guard += 1
  }
  return nights
}

export function stayCovers(stay: Stay, night: string) {
  return Boolean(stay.checkIn && stay.checkOut && stay.checkIn <= night && night < stay.checkOut)
}

export type NightRow = {
  date: string
  stays: Stay[]
  missingGroups: string[]
}

function namedGroups(trip: Trip) {
  const names: string[] = []
  for (const stay of trip.stays) {
    const who = stay.who?.trim()
    if (!who || who === "Everyone" || names.includes(who)) continue
    names.push(who)
  }
  return names
}

function coversGroup(stay: Stay, group: string) {
  const who = stay.who?.trim()
  return !who || who === "Everyone" || who === group
}

export function nightRows(trip: Trip): NightRow[] {
  const groups = namedGroups(trip)
  return tripNights(trip).map((date) => {
    const stays = trip.stays.filter((stay) => stayCovers(stay, date))
    const missingGroups = groups.filter((group) => !stays.some((stay) => coversGroup(stay, group)))
    return { date, stays, missingGroups }
  })
}
