import type { Trip } from "@/lib/types"

export function todayIso(now = new Date()) {
  const month = String(now.getMonth() + 1).padStart(2, "0")
  const day = String(now.getDate()).padStart(2, "0")
  return `${now.getFullYear()}-${month}-${day}`
}

export function formatDay(iso: string) {
  return new Intl.DateTimeFormat("en-SG", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(new Date(`${iso}T00:00:00Z`))
}

export function formatRange(start: string, end: string) {
  const startDate = new Date(`${start}T00:00:00Z`)
  const endDate = new Date(`${end}T00:00:00Z`)
  const sameYear = startDate.getUTCFullYear() === endDate.getUTCFullYear()
  const left = new Intl.DateTimeFormat("en-SG", {
    day: "numeric",
    month: "short",
    year: sameYear ? undefined : "numeric",
    timeZone: "UTC",
  }).format(startDate)
  const right = new Intl.DateTimeFormat("en-SG", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(endDate)
  return `${left} – ${right}`
}

export type TripTiming = "upcoming" | "on-trip" | "past"

export function tripTiming(trip: Trip, today = todayIso()): TripTiming {
  if (today < trip.start) return "upcoming"
  if (today > trip.end) return "past"
  return "on-trip"
}

export function formatMoney(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat("en-SG", {
      style: "currency",
      currency,
      maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
    }).format(amount)
  } catch {
    return `${currency} ${amount.toFixed(0)}`
  }
}

export function safeHref(href: string) {
  try {
    const url = new URL(href)
    if (url.protocol === "https:") return url.toString()
  } catch {
    return null
  }
  return null
}

export function uid(prefix: string) {
  return `${prefix}-${crypto.randomUUID()}`
}

export function addDays(iso: string, days: number) {
  const date = new Date(`${iso}T12:00:00Z`)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

export function eachDate(start: string, end: string) {
  const dates: string[] = []
  let cursor = start
  let guard = 0
  while (cursor <= end && guard < 21) {
    dates.push(cursor)
    cursor = addDays(cursor, 1)
    guard += 1
  }
  return dates.length > 0 ? dates : [start]
}

export function placeById(trip: Trip, id?: string) {
  if (!id) return undefined
  return trip.places.find((place) => place.id === id)
}

export function nightsBetween(checkIn: string, checkOut: string) {
  const start = new Date(`${checkIn}T00:00:00Z`).getTime()
  const end = new Date(`${checkOut}T00:00:00Z`).getTime()
  const nights = Math.round((end - start) / 86_400_000)
  return Number.isFinite(nights) && nights > 0 ? nights : 0
}
