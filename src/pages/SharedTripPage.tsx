import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"

type Item = Record<string, unknown>
type Shared = {
  title: string; destination: string; start: string; end: string
  days: Item[]; stays: Item[]; flights: Item[]; todos: Item[]
  places: Item[]; budget: Item[]; people: Item[]
}

function groupFor(who: unknown): string {
  const value = typeof who === "string" ? who.trim() : ""
  if (!value || /^(everyone|all|together|whole group)$/i.test(value)) return "Together"
  if (/father|mother|daddy|mummy|parent/i.test(value)) return "Daddy & Mummy"
  if (/joan|family|kids|children|joash|josiah/i.test(value)) return "Joan & Family"
  return value
}

function StopList({ items }: { items: Item[] }) {
  return <div className="divide-y">
    {items.map((stop, index) => <div key={String(stop.id ?? index)} className="py-2 text-sm">
      <span className="font-medium">{String(stop.time ?? "")}</span>
      {stop.time ? " · " : ""}{String(stop.title ?? "")}
      {stop.status ? <span className="ml-2 text-xs text-muted-foreground">({String(stop.status)})</span> : null}
    </div>)}
  </div>
}

export function SharedTripPage({ token }: { token: string }) {
  const [trip, setTrip] = useState<Shared | null>(null)
  const [status, setStatus] = useState("Loading trip…")
  useEffect(() => {
    let active = true
    supabase.rpc("shared_trip", { p_token: token }).then(({ data, error }) => {
      if (!active) return
      if (error || !data) { setStatus("This trip link is unavailable."); return }
      setTrip(data as Shared)
    })
    return () => { active = false }
  }, [token])
  if (!trip) return <main className="mx-auto max-w-xl p-8">{status}</main>

  const sections: [string, Item[], string[]][] = [
    ["Flights", trip.flights, ["number", "from", "to", "departDate", "departTime", "arriveDate", "arriveTime"]],
    ["To-dos", trip.todos, ["title", "due"]],
    ["Locations", trip.places, ["name", "address"]],
    ["Expenses", trip.budget, ["label", "currency", "amount"]],
    ["Travellers", trip.people, ["name"]],
  ]
  const preferredOrder = ["Joan & Family", "Daddy & Mummy", "Together"]
  const sortGroups = (a: string, b: string) => {
    const ai = preferredOrder.indexOf(a), bi = preferredOrder.indexOf(b)
    return (ai < 0 ? 3 : ai) - (bi < 0 ? 3 : bi) || a.localeCompare(b)
  }

  return <main className="mx-auto max-w-3xl space-y-5 p-5">
    <p className="text-sm text-muted-foreground">readysetroam · Shared trip · View only</p>
    <h1 className="text-3xl">{trip.title}</h1>
    <p>{trip.destination} · {trip.start} to {trip.end}</p>
    <button className="underline" onClick={() => window.location.reload()}>Refresh latest plan</button>
    {trip.days.map((day, i) => {
      const stops = Array.isArray(day.stops) ? day.stops as Item[] : []
      const grouped = new Map<string, Item[]>()
      for (const stop of stops) {
        const group = groupFor(stop.who)
        grouped.set(group, [...(grouped.get(group) ?? []), stop])
      }
      return <section key={String(day.id ?? i)} className="rounded-xl border bg-white p-4">
        <h2 className="mb-3 text-xl">{String(day.date)} · {String(day.title)}</h2>
        <div className="space-y-3">
          {[...grouped.keys()].sort(sortGroups).map(group => <div key={group} className="rounded-lg border p-3">
            <h3 className="font-semibold">{group}</h3>
            <StopList items={grouped.get(group) ?? []} />
          </div>)}
          {!stops.length && <p className="text-sm text-muted-foreground">No activities listed.</p>}
        </div>
      </section>
    })}
    {!!trip.stays.length && <section className="rounded-xl border bg-white p-4">
      <h2 className="mb-3 text-xl">Accommodation</h2>
      {Array.from(new Set(trip.stays.map(stay => groupFor(stay.who)))).sort(sortGroups).map(group => <div key={group} className="mb-3 rounded-lg border p-3">
        <h3 className="font-semibold">{group}</h3>
        {trip.stays.filter(stay => groupFor(stay.who) === group).map((stay, i) =>
          <p key={String(stay.id ?? i)} className="py-2 text-sm">{[stay.name, stay.checkIn, stay.checkOut].filter(Boolean).map(String).join(" · ")}</p>)}
      </div>)}
    </section>}
    {sections.filter(([, items]) => items.length).map(([title, items, keys]) =>
      <section key={title} className="rounded-xl border bg-white p-4">
        <h2 className="text-xl">{title}</h2>
        {items.map((item, i) => <p key={String(item.id ?? i)} className="py-2 text-sm">
          {title === "To-dos" ? (item.done ? "✓ " : "○ ") : ""}
          {keys.map(key => item[key]).filter(value => value != null && value !== "").map(String).join(" · ")}
        </p>)}
      </section>)}
  </main>
}
