import type { Trip, Stop } from "./types"
import { validateTrip } from "./tripImport"

type Change =
  | { action: "addStop"; date: string; stop: Stop }
  | { action: "updateStop"; date: string; stopId: string; before: Stop; stop: Stop }
  | { action: "removeStop"; date: string; stopId: string; before: Stop }
export type TripPatch = { version: 2; operation: "update"; tripId: string; changes: Change[] }

const equal = (a: unknown, b: unknown): boolean => {
  if (a === b) return true
  if (!a || !b || typeof a !== "object" || typeof b !== "object") return false
  if (Array.isArray(a) !== Array.isArray(b)) return false
  const x = a as Record<string, unknown>, y = b as Record<string, unknown>
  return Object.keys(x).length === Object.keys(y).length &&
    Object.keys(x).every(k => Object.prototype.hasOwnProperty.call(y,k) && equal(x[k],y[k]))
}
export function parsePatch(raw: string): TripPatch {
  if (raw.length > 500000) throw new Error("Update too large")
  const p = JSON.parse(raw) as TripPatch
  if (!p || p.version !== 2 || p.operation !== "update" || typeof p.tripId !== "string" ||
      !/^[a-zA-Z0-9_-]{1,100}$/.test(p.tripId) || !Array.isArray(p.changes) ||
      !p.changes.length || p.changes.length > 200) throw new Error("Invalid update")
  for (const c of p.changes) {
    if (!c || typeof c.date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(c.date)) throw new Error("Invalid update date")
    if (c.action === "addStop") {
      if (!c.stop || typeof c.stop.id !== "string" || c.stop.status === "booked") throw new Error("Invalid new stop")
    } else if (c.action === "updateStop" || c.action === "removeStop") {
      if (typeof c.stopId !== "string" || !c.before || c.before.id !== c.stopId ||
          (c.action === "updateStop" && (!c.stop || c.stop.id !== c.stopId))) throw new Error("Invalid stop update")
    } else throw new Error("Unsupported update action")
  }
  return p
}
export function previewPatch(original: Trip, patch: TripPatch) {
  if (original.id !== patch.tripId) throw new Error("Wrong trip")
  const trip = structuredClone(original)
  const messages: string[] = []
  let changed = false
  for (const c of patch.changes) {
    const days = trip.days.filter(d => d.date === c.date)
    if (days.length !== 1) throw new Error("Missing or ambiguous day: " + c.date)
    const day = days[0]
    const key = c.action === "addStop" ? c.stop.id : c.stopId
    const index = day.stops.findIndex(s => s.id === key)
    const existing = day.stops[index]
    if (c.action === "addStop") {
      if (existing && !equal(existing,c.stop)) throw new Error("Stop ID conflict: " + key)
      if (existing) { messages.push("Already added: " + existing.title); continue }
      day.stops.push(structuredClone(c.stop))
      messages.push(c.date + ": Add " + c.stop.title + " (" + c.stop.time + ")")
    } else {
      if (c.action === "removeStop" && !existing) { messages.push("Already absent: " + key); continue }
      if (c.action === "updateStop" && equal(existing,c.stop)) { messages.push("Already updated: " + key); continue }
      if (!existing || !equal(existing,c.before)) throw new Error("Local edit conflict: " + key)
      if (existing.status === "booked" || existing.kind === "flight" || existing.kind === "stay") throw new Error("Protected booking: " + existing.title)
      if (c.action === "removeStop") { day.stops.splice(index,1); messages.push(c.date + ": Remove " + existing.title) }
      else {
        if (c.stop.status === "booked" || c.stop.kind === "flight" || c.stop.kind === "stay") throw new Error("Booking changes require manual editing")
        day.stops[index] = structuredClone(c.stop)
        messages.push(c.date + ": Update " + existing.title + " → " + c.stop.title + " (" + existing.time + " → " + c.stop.time + ")")
        messages.push("Before: " + JSON.stringify(existing))
        messages.push("After: " + JSON.stringify(c.stop))
      }
    }
    changed = true
  }
  return { trip: validateTrip(trip), messages, changed }
}
