import type { Trip } from "./types"

const id = /^[a-zA-Z0-9_-]{1,100}$/
const date = (s: unknown) => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s)) && new Date(s).toISOString().slice(0,10) === s
const str = (s: unknown) => typeof s === "string" && s.length <= 10000
type Obj = Record<string, unknown>
function obj(v: unknown): Obj {
  if (!v || typeof v !== "object" || Array.isArray(v)) throw new Error("Expected an object")
  return v as Obj
}
function check(ok: unknown, message: string): asserts ok {
  if (!ok) throw new Error(message)
}
function fields(o: Obj, required: string[], optional: string[] = []) {
  for (const k of required) check(str(o[k]), "Invalid " + k)
  for (const k of optional) check(o[k] === undefined || str(o[k]), "Invalid " + k)
}
function rows(v: unknown, fn: (o: Obj) => void, unique = true) {
  check(Array.isArray(v) && v.length <= 2000, "Invalid list")
  const seen = new Set<string>()
  for (const item of v) {
    const o = obj(item)
    if (unique) {
      check(typeof o.id === "string" && id.test(o.id) && !seen.has(o.id), "Invalid or duplicate ID")
      seen.add(o.id)
    }
    fn(o)
  }
}
function safeUrl(v: unknown) {
  try { return typeof v === "string" && ["https:", "http:"].includes(new URL(v).protocol) } catch { return false }
}
export function validateTrip(value: unknown): Trip {
  const t = obj(value)
  fields(t, ["id","title","destination","summary","start","end","party","currency"])
  check(id.test(t.id as string) && (t.title as string).trim() && date(t.start) && date(t.end) && (t.start as string) <= (t.end as string), "Invalid trip details")
  check(/^[A-Z]{3}$/.test(t.currency as string), "Invalid currency")
  const places = new Set<unknown>()
  rows(t.places, p => {
    fields(p, ["name"], ["address"])
    check(typeof p.lat === "number" && Number.isFinite(p.lat) && Math.abs(p.lat) <= 90 && typeof p.lng === "number" && Number.isFinite(p.lng) && Math.abs(p.lng) <= 180, "Invalid coordinates")
    check(p.plot === undefined || typeof p.plot === "boolean", "Invalid map flag")
    places.add(p.id)
  })
  const placeRef = (o: Obj) => check(o.placeId === undefined || places.has(o.placeId), "Unknown place reference")
  rows(t.people, p => fields(p, ["name"], ["note"]))
  rows(t.links, l => { fields(l, ["label","href"]); check(safeUrl(l.href), "Invalid link") }, false)
  rows(t.days, d => {
    fields(d, ["date","label","title","route"], ["warning","transport"])
    check(date(d.date) && (d.date as string) >= (t.start as string) && (d.date as string) <= (t.end as string), "Day outside trip")
    rows(d.stops, s => {
      fields(s, ["time","title","kind","status"], ["who","notes"])
      check(["flight","drive","meal","activity","stay","photo","shopping","note"].includes(s.kind as string), "Invalid stop kind")
      check(["planned","optional","booked"].includes(s.status as string), "Invalid stop status")
      placeRef(s)
      if (s.alternatives !== undefined) rows(s.alternatives, a => fields(a, ["name"], ["detail"]), false)
    })
  })
  rows(t.stays, s => {
    fields(s, ["name","checkIn","checkOut","confirmation"], ["who","notes"])
    check(date(s.checkIn) && date(s.checkOut) && (s.checkIn as string) <= (s.checkOut as string), "Invalid stay dates")
    placeRef(s)
  })
  rows(t.budget, b => {
    fields(b, ["category","label","currency"], ["paidBy"])
    check(typeof b.amount === "number" && Number.isFinite(b.amount) && /^[A-Z]{3}$/.test(b.currency as string), "Invalid budget")
    if (b.splitGroups !== undefined) check(Array.isArray(b.splitGroups) && b.splitGroups.every(str), "Invalid split groups")
    if (b.shares !== undefined) rows(b.shares, s => { fields(s, ["name"]); check(typeof s.amount === "number" && Number.isFinite(s.amount), "Invalid share") }, false)
  })
  if (t.flights !== undefined) rows(t.flights, f => {
    fields(f, ["group","from","to","departDate","departTime","arriveDate","arriveTime"], ["number","notes"])
    check(date(f.departDate) && date(f.arriveDate), "Invalid flight dates")
  })
  if (t.rentals !== undefined) rows(t.rentals, r => {
    fields(r, ["company","vehicle","pickup","dropoff","pickupDate","dropoffDate","confirmation"], ["who","notes"])
    check(date(r.pickupDate) && date(r.dropoffDate) && (r.pickupDate as string) <= (r.dropoffDate as string), "Invalid rental dates")
  })
  return t as unknown as Trip
}
export function parseTripImport(raw: string): Trip {
  check(raw.length <= 500000, "Trip is too large")
  const envelope = obj(JSON.parse(raw))
  if (envelope.version !== undefined) {
    check(envelope.version === 1, "Unsupported import version")
    return validateTrip(envelope.trip)
  }
  return validateTrip(envelope)
}
export function decodeTripLink(hash: string): Trip {
  const encoded = new URLSearchParams(hash.replace(/^#/, "")).get("import")
  check(encoded && encoded.length <= 200000, "Missing or oversized import link")
  return parseTripImport(encoded)
}
