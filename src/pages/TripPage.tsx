import { TripShare } from "@/components/TripShare"
import { useMemo, useState } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import { ArrowLeft } from "lucide-react"
import { toast } from "sonner"
import { TripTodos } from "@/components/TripTodos"
import { TripMap, type MapPoint } from "@/components/TripMap"
import {
  blankBudget,
  blankFlight,
  blankPerson,
  blankStay,
  blankStop,
  BudgetDialog,
  DayDialog,
  FlightDialog,
  PersonDialog,
  StayDialog,
  StopDialog,
} from "@/components/editors"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { dayColor, trackColor } from "@/lib/colors"
import { addDays, formatDay, formatMoney, formatRange, nightsBetween, placeById, safeHref, tripTiming, uid } from "@/lib/format"
import { groupBalances, lineShare } from "@/lib/money"
import { nightRows } from "@/lib/nights"
import { isPublishedTrip, useTrips } from "@/lib/store"
import type { BudgetLine, Day, Flight, Person, Place, Stay, Stop, StopKind, Trip } from "@/lib/types"

const kindLabel: Record<StopKind, string> = {
  flight: "Flight",
  drive: "Drive",
  meal: "Meal",
  activity: "Do",
  stay: "Stay",
  photo: "Photo",
  shopping: "Shop",
  note: "Note",
}

const timingLabel = {
  upcoming: "Coming up",
  "on-trip": "On the road",
  past: "Past trip",
} as const

function routeEnd(route: string) {
  if (!route.includes("→")) return ""
  const parts = route.split("→").map((part) => part.trim()).filter(Boolean)
  return parts[parts.length - 1] ?? ""
}

function tracksFor(stops: Stop[]) {
  if (!stops.some((stop) => stop.who?.trim())) return [{ name: "", stops }]
  const buckets = new Map<string, Stop[]>()
  const order: string[] = []
  for (const stop of stops) {
    const name = stop.who?.trim() || "Together"
    if (!buckets.has(name)) {
      order.push(name)
      buckets.set(name, [])
    }
    buckets.get(name)?.push(stop)
  }
  order.sort((left, right) => {
    const leftShared = left === "Together" || left === "Everyone"
    const rightShared = right === "Together" || right === "Everyone"
    if (leftShared === rightShared) return 0
    return leftShared ? 1 : -1
  })
  return order.map((name) => ({ name, stops: buckets.get(name) ?? [] }))
}

function flightMinutes(time: string) {
  const lower = time.toLowerCase()
  const match = lower.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/)
  if (match) {
    let hour = Number(match[1])
    const minute = Number(match[2] || 0)
    if (match[3] === "pm" && hour < 12) hour += 12
    if (match[3] === "am" && hour === 12) hour = 0
    return hour * 60 + minute
  }
  if (lower.includes("night")) return 22 * 60
  if (lower.includes("evening")) return 18 * 60
  if (lower.includes("afternoon")) return 15 * 60
  if (lower.includes("morning")) return 9 * 60
  return 12 * 60
}

function flightStamp(date: string, time: string) {
  if (!date && !time) return "Time not set"
  if (!date) return time
  return `${formatDay(date)}${time ? ` · ${time}` : ""}`
}

function flightNeedsDetail(flight: Flight) {
  const ends = `${flight.from} ${flight.to}`.toLowerCase()
  return !flight.departTime || !flight.arriveTime || ends.includes("not on the sheet")
}

export function TripPage() {
  const { tripId } = useParams()
  const navigate = useNavigate()
  const { trips, updateTrip, resetTrip, removeTrip, cloud, busy } = useTrips()
  const trip = trips.find((item) => item.id === tripId)
  const [trackedId, setTrackedId] = useState(tripId)
  const [dayId, setDayId] = useState(trip?.days[0]?.id ?? "")
  const [selectedStop, setSelectedStop] = useState<string>()
  const [wholeTrip, setWholeTrip] = useState(false)
  const [stopDraft, setStopDraft] = useState<{ dayId: string; stop: Stop; creating: boolean } | null>(null)
  const [stayDraft, setStayDraft] = useState<{ stay: Stay; creating: boolean } | null>(null)
  const [budgetDraft, setBudgetDraft] = useState<{ line: BudgetLine; creating: boolean } | null>(null)
  const [personDraft, setPersonDraft] = useState<{ person: Person; creating: boolean } | null>(null)
  const [dayDraft, setDayDraft] = useState<{ day: Day; creating: boolean } | null>(null)
  const [flightDraft, setFlightDraft] = useState<{ flight: Flight; creating: boolean } | null>(null)

  if (trip && trackedId !== trip.id) {
    setTrackedId(trip.id)
    setDayId(trip.days[0]?.id ?? "")
    setSelectedStop(undefined)
    setWholeTrip(false)
    setDayDraft(null)
    setFlightDraft(null)
  }

  const day = trip?.days.find((item) => item.id === dayId) ?? trip?.days[0]

  const points = useMemo(() => {
    if (!trip || !day) return []
    const source = wholeTrip ? trip.days : [day]
    const next: MapPoint[] = []
    for (const item of source) {
      const index = trip.days.findIndex((entry) => entry.id === item.id)
      for (const stop of item.stops) {
        const place = placeById(trip, stop.placeId)
        if (!place || place.plot === false) continue
        next.push({
          stopId: stop.id,
          dayId: item.id,
          dayLabel: item.label,
          color: dayColor(Math.max(index, 0)),
          lat: place.lat,
          lng: place.lng,
          title: stop.title,
          time: stop.time || item.label,
          number: next.length + 1,
        })
      }
    }
    return next
  }, [trip, day, wholeTrip])

  if (!trip || !day) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16">
        <h1 className="text-3xl">That trip is not on this device.</h1>
        <p className="mt-3 text-muted-foreground">It may have been removed, or the link is missing a piece.</p>
        <Button asChild className="mt-6">
          <Link to="/">
            <ArrowLeft />
            Back to the trips
          </Link>
        </Button>
      </div>
    )
  }

  const current = trip
  const people = current.people.map((person) => person.name)
  const balances = groupBalances(current)
  const nights = nightRows(current)
  const openNights = nights.filter((night) => night.stays.length === 0 || night.missingGroups.length > 0).length
  const dayIndex = Math.max(current.days.findIndex((item) => item.id === day.id), 0)
  const color = dayColor(dayIndex)
  const legend: MapPoint[] = []
  for (const point of points) {
    if (legend.some((item) => item.dayId === point.dayId)) continue
    legend.push(point)
  }

  const commit = (next: Trip, message = "Saved on this device") => {
    void updateTrip(next).then(() => toast.success(cloud ? "Saved to cloud" : message)).catch(e => toast.error(String(e.message ?? e)))
  }

  const saveStop = (stop: Stop, place?: Place) => {
    if (!stopDraft) return
    commit({
      ...current,
      places: place ? [...current.places, place] : current.places,
      days: current.days.map((item) => {
        if (item.id !== stopDraft.dayId) return item
        const exists = item.stops.some((entry) => entry.id === stop.id)
        return {
          ...item,
          stops: exists ? item.stops.map((entry) => (entry.id === stop.id ? stop : entry)) : [...item.stops, stop],
        }
      }),
    })
    setDayId(stopDraft.dayId)
    setSelectedStop(stop.id)
    setStopDraft(null)
  }

  const deleteStop = () => {
    if (!stopDraft) return
    commit(
      {
        ...current,
        days: current.days.map((item) =>
          item.id === stopDraft.dayId
            ? { ...item, stops: item.stops.filter((stop) => stop.id !== stopDraft.stop.id) }
            : item,
        ),
      },
      "Stop removed on this device",
    )
    setStopDraft(null)
  }

  const saveDay = (nextDay: Day) => {
    const without = current.days.filter((item) => item.id !== nextDay.id)
    const days = [...without, nextDay].sort((left, right) => left.date.localeCompare(right.date))
    commit({
      ...current,
      start: days[0]?.date ?? current.start,
      end: days[days.length - 1]?.date ?? current.end,
      days,
    })
    setDayId(nextDay.id)
    setWholeTrip(false)
    setDayDraft(null)
  }

  const splitChoices = [
    ...new Set([
      ...people,
      ...current.stays.map((stay) => stay.who ?? ""),
      ...(current.flights ?? []).map((flight) => flight.group),
      ...current.budget.flatMap((line) => line.splitGroups ?? []),
    ]),
  ].filter((name) => name && name !== "Everyone")

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:py-8">
      <Button asChild variant="outline" size="sm">
        <Link to="/">
          <ArrowLeft />
          Back
        </Link>
      </Button>
      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-3xl">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xs font-medium tracking-[0.16em] text-primary uppercase">{trip.destination}</p>
            <Badge variant="secondary">{timingLabel[tripTiming(trip)]}</Badge>
          </div>
          <h1 className="mt-2 text-4xl text-balance">{trip.title}</h1>
          <p className="mt-2 text-muted-foreground">
            {formatRange(trip.start, trip.end)} · {trip.party}
          </p>
          <p className="mt-3 max-w-2xl text-sm leading-6">{trip.summary}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {isPublishedTrip(trip.id) ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                if (!window.confirm("Restore the published copy? This replaces current trip details.")) return
                void resetTrip(trip.id).then(() => toast.success("Restored the published copy")).catch(e => toast.error(String(e.message ?? e)))
              }}
            >
              Restore published copy
            </Button>
          ) : (
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                if (!window.confirm("Delete this trip?")) return
                void removeTrip(trip.id).then(() => navigate("/")).catch(e => toast.error(String(e.message ?? e)))
              }}
            >
              Delete this trip
            </Button>
          )}
        </div>
      </div>
      <p className="mt-4 text-sm text-muted-foreground">
        {cloud ? (busy ? "Cloud operation in progress…" : "Private cloud trip. Sharing is not enabled yet.") : "Changes are saved in this browser."}
      </p>
      {trip.links.length > 0 ? (
        <ul className="mt-3 flex flex-wrap gap-2">
          {trip.links.map((link) => {
            const href = safeHref(link.href)
            return href ? (
              <li key={href}>
                <a className="text-sm text-primary underline-offset-4 hover:underline" href={href} target="_blank" rel="noreferrer">
                  {link.label}
                </a>
              </li>
            ) : null
          })}
        </ul>
      ) : null}

      {cloud && <TripShare key={trip.id} tripId={trip.id} />}
      <Tabs defaultValue="plan" className="mt-6">
        <TabsList className="h-auto flex-wrap bg-white/70">
          <TabsTrigger value="plan">Plan</TabsTrigger>
          <TabsTrigger value="stays">Stays</TabsTrigger>
          <TabsTrigger value="flights">Flights</TabsTrigger>
          <TabsTrigger value="money">Money</TabsTrigger>
          <TabsTrigger value="people">People</TabsTrigger>
          <TabsTrigger value="todos">To-dos ({(trip.todos ?? []).filter(t => !t.done).length})</TabsTrigger>
        </TabsList>

        <TabsContent value="plan" className="mt-4">
          <div className="mb-3 flex flex-wrap gap-2">
            <Button type="button" variant={wholeTrip ? "outline" : "default"} onClick={() => setWholeTrip(false)}>
              This day
            </Button>
            <Button type="button" variant={wholeTrip ? "default" : "outline"} onClick={() => setWholeTrip(true)}>
              Whole trip
            </Button>
            <Button type="button" variant="outline" onClick={() => setStopDraft({ dayId: day.id, stop: blankStop(), creating: true })}>
              Add a stop
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                const last = trip.days[trip.days.length - 1]
                const date = last ? addDays(last.date, 1) : trip.start
                const from = routeEnd(last?.route || "")
                setDayDraft({
                  creating: true,
                  day: {
                    id: uid("day"),
                    date,
                    label: `Day ${trip.days.length + 1}`,
                    title: "",
                    route: from ? `${from} → ` : "",
                    stops: [],
                  },
                })
              }}
            >
              Add a day
            </Button>
          </div>
          <div className="grid items-start gap-4 lg:grid-cols-[12rem_minmax(0,1fr)_minmax(18rem,0.9fr)]">
            <div className="flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible">
              {trip.days.map((item, index) => {
                const active = item.id === day.id && !wholeTrip
                const swatch = dayColor(index)
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setDayId(item.id)
                      setSelectedStop(undefined)
                      setWholeTrip(false)
                    }}
                    className="min-w-36 rounded-2xl border bg-card px-3 py-2 text-left lg:min-w-0"
                    style={
                      active
                        ? { background: swatch, borderColor: swatch, color: "#241833" }
                        : { borderLeftWidth: 4, borderLeftColor: swatch }
                    }
                  >
                    <span className="block text-xs opacity-80">{item.label}</span>
                    <span className="block text-sm font-medium">{formatDay(item.date)}</span>
                    <span className="mt-1 block text-xs opacity-80">{item.route || item.title}</span>
                  </button>
                )
              })}
            </div>

            <section>
              <div className="rounded-3xl border bg-card p-4 shadow-sm" style={{ borderTopWidth: 4, borderTopColor: color }}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-medium tracking-wide uppercase" style={{ color }}>
                      {day.label} · {formatDay(day.date)}
                    </p>
                    <h2 className="mt-1 text-2xl">{day.title}</h2>
                    {day.route ? (
                      <p className="mt-2 text-base font-medium">{day.route}</p>
                    ) : (
                      <p className="mt-2 text-sm text-muted-foreground">No route on this day yet.</p>
                    )}
                  </div>
                  <Button type="button" variant="outline" size="sm" onClick={() => setDayDraft({ day, creating: false })}>
                    Edit day
                  </Button>
                </div>
                {day.transport ? <p className="mt-3 text-sm">{day.transport}</p> : null}
                {day.warning ? (
                  <p className="mt-3 rounded-2xl bg-accent px-3 py-2 text-sm text-accent-foreground">{day.warning}</p>
                ) : null}
              </div>
              {day.stops.length === 0 ? (
                <div className="mt-3 rounded-3xl border border-dashed bg-card/80 px-4 py-8 text-sm text-muted-foreground">
                  This day is empty. Add a flight, a meal, a hotel check-in, or a walk.
                </div>
              ) : (
                <div className={`mt-3 grid gap-3 ${tracksFor(day.stops).length > 1 ? "md:grid-cols-2" : ""}`}>
                  {tracksFor(day.stops).map((track) => (
                    <div key={track.name || "together"}>
                      {track.name ? (
                        <p className="mb-2 flex items-center gap-2 text-sm font-medium">
                          <span className="size-2.5 rounded-full" style={{ background: trackColor(track.name) }} />
                          {track.name}
                        </p>
                      ) : null}
                      <ol className="grid gap-2">
                        {track.stops.map((stop) => (
                          <StopCard
                            key={stop.id}
                            trip={trip}
                            stop={stop}
                            active={selectedStop === stop.id}
                            onSelect={() => setSelectedStop(stop.id)}
                            onEdit={() => setStopDraft({ dayId: day.id, stop, creating: false })}
                          />
                        ))}
                      </ol>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <div className="lg:sticky lg:top-16 lg:h-[calc(100vh-7rem)]">
              <TripMap
                points={points}
                selectedId={selectedStop}
                onSelect={(stopId, nextDayId) => {
                  setSelectedStop(stopId)
                  setDayId(nextDayId)
                }}
              />
              {legend.length > 0 ? (
                <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
                  {legend.map((point) => (
                    <li key={point.dayId} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <span className="size-2.5 rounded-full" style={{ background: point.color }} />
                      {point.dayLabel}
                    </li>
                  ))}
                </ul>
              ) : null}
              <p className="mt-2 text-xs text-muted-foreground">
                {wholeTrip
                  ? "Every pinned stop, in order. Each day has its own colour on the pins and the line."
                  : "Pins for this day, in the colour for this day."}{" "}
                Scroll the map with two fingers, or use the controls.
              </p>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="stays" className="mt-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <p className="max-w-xl text-sm text-muted-foreground">
              {openNights > 0
                ? `${openNights} night${openNights === 1 ? "" : "s"} still need a bed for someone. Open nights are marked in rose.`
                : "Every night on this trip has a hotel for the people who already have a booking."}
            </p>
            <Button type="button" onClick={() => setStayDraft({ stay: blankStay(trip.start), creating: true })}>
              Add a hotel
            </Button>
          </div>
          {nights.length === 0 ? (
            <div className="rounded-3xl border border-dashed bg-card px-4 py-8 text-sm text-muted-foreground">
              Add a last day after the first night if you want the stay timeline.
            </div>
          ) : (
            <ol className="grid">
              {nights.map((night) => {
                const open = night.stays.length === 0 || night.missingGroups.length > 0
                return (
                  <li key={night.date} className="grid grid-cols-[1.25rem_minmax(0,1fr)] gap-3">
                    <span className="flex flex-col items-center">
                      <span className={`mt-4 size-3 rounded-full ${open ? "bg-rose-400" : "bg-violet-400"}`} />
                      <span className="mt-1 w-px flex-1 bg-violet-200" />
                    </span>
                    <div className={`mb-3 rounded-3xl border px-4 py-3 ${open ? "border-rose-200 bg-rose-50" : "bg-card"}`}>
                      <p className="text-sm font-medium">{formatDay(night.date)}</p>
                      {night.stays.length === 0 ? (
                        <p className="mt-1 text-sm text-rose-700">No booking for this night.</p>
                      ) : (
                        <ul className="mt-2 grid gap-2">
                          {night.stays.map((stay) => (
                            <li key={stay.id} className="text-sm">
                              <span className="font-medium">{stay.name}</span>
                              <span className="text-muted-foreground">
                                {" "}
                                · {stay.who || "Everyone"} · {formatDay(stay.checkIn)} to {formatDay(stay.checkOut)}
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}
                      {night.missingGroups.length > 0 ? (
                        <p className="mt-2 text-sm font-medium text-rose-700">
                          Still open: {night.missingGroups.join(", ")}
                        </p>
                      ) : null}
                    </div>
                  </li>
                )
              })}
            </ol>
          )}
          {trip.stays.length > 0 ? (
            <ul className="mt-2 grid gap-3 sm:grid-cols-2">
              {trip.stays.map((stay) => {
                const nightsBooked = nightsBetween(stay.checkIn, stay.checkOut)
                const place = placeById(trip, stay.placeId)
                return (
                  <li key={stay.id} className="rounded-3xl border bg-card p-4 shadow-sm">
                    <h2 className="text-xl">{stay.name}</h2>
                    {stay.who ? <p className="mt-1 text-xs font-medium tracking-wide text-primary uppercase">{stay.who}</p> : null}
                    <p className="mt-1 text-sm text-muted-foreground">
                      {stay.checkIn && stay.checkOut ? `${formatDay(stay.checkIn)} – ${formatDay(stay.checkOut)}` : "Dates not set"}
                      {nightsBooked ? ` · ${nightsBooked} night${nightsBooked === 1 ? "" : "s"}` : ""}
                    </p>
                    {place ? <p className="mt-2 text-sm">{place.name}</p> : null}
                    {stay.notes ? <p className="mt-2 text-sm leading-6 text-muted-foreground">{stay.notes}</p> : null}
                    {stay.confirmation ? (
                      <p className="mt-3 rounded-2xl bg-secondary px-3 py-2 text-sm">Confirmation on this device: {stay.confirmation}</p>
                    ) : (
                      <p className="mt-3 text-xs text-muted-foreground">No confirmation stored on this device.</p>
                    )}
                    <Button type="button" variant="ghost" size="sm" className="mt-2" onClick={() => setStayDraft({ stay, creating: false })}>
                      Edit
                    </Button>
                  </li>
                )
              })}
            </ul>
          ) : null}
        </TabsContent>

        <TabsContent value="flights" className="mt-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <p className="max-w-xl text-sm text-muted-foreground">
              Each group keeps its own legs. A rose card still needs a time, a city, or a flight number from the sheet.
            </p>
            <Button type="button" onClick={() => setFlightDraft({ flight: blankFlight(people[0] ?? ""), creating: true })}>
              Add a flight
            </Button>
          </div>
          {(trip.flights ?? []).length === 0 ? (
            <div className="rounded-3xl border border-dashed bg-card px-4 py-8 text-sm text-muted-foreground">
              No flights yet. Add the outbound and the way home for each group, including a connection as its own leg.
            </div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {flightGroupNames(trip).map((group) => {
                const legs = (trip.flights ?? [])
                  .filter((flight) => flight.group === group)
                  .sort((left, right) => {
                    const byDate = (left.departDate || "9999").localeCompare(right.departDate || "9999")
                    if (byDate !== 0) return byDate
                    return flightMinutes(left.departTime) - flightMinutes(right.departTime)
                  })
                return (
                  <section key={group} className="rounded-3xl border bg-card p-4 shadow-sm" style={{ borderTopWidth: 4, borderTopColor: trackColor(group) }}>
                    <h2 className="text-xl">{group}</h2>
                    <ol className="mt-3 grid gap-3">
                      {legs.map((flight) => {
                        const open = flightNeedsDetail(flight)
                        return (
                          <li key={flight.id} className={`rounded-2xl border px-3 py-3 ${open ? "border-rose-200 bg-rose-50" : "bg-background/60"}`}>
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="text-sm font-medium">
                                  {flight.from} → {flight.to}
                                </p>
                                {flight.number ? <p className="text-xs text-muted-foreground">{flight.number}</p> : null}
                              </div>
                              {open ? <Badge variant="secondary">Needs detail</Badge> : <Badge>Booked</Badge>}
                            </div>
                            <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                              <div>
                                <p className="text-xs text-muted-foreground">Depart</p>
                                <p className="font-medium">{flightStamp(flight.departDate, flight.departTime)}</p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">Arrive</p>
                                <p className="font-medium">{flightStamp(flight.arriveDate, flight.arriveTime)}</p>
                              </div>
                            </div>
                            {flight.notes ? <p className="mt-2 text-sm leading-6 text-muted-foreground">{flight.notes}</p> : null}
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="mt-2"
                              onClick={() => setFlightDraft({ flight, creating: false })}
                            >
                              Edit
                            </Button>
                          </li>
                        )
                      })}
                    </ol>
                  </section>
                )
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="money" className="mt-4">
          <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-sm text-muted-foreground">
                Split a line across groups. The cards show what each group owes you, and what you owe them. Those balances stay in this browser.
              </p>
              <p className="mt-2 font-display text-3xl">{moneySummary(trip)}</p>
            </div>
            <Button type="button" onClick={() => setBudgetDraft({ line: blankBudget(trip.currency), creating: true })}>
              Add a line
            </Button>
          </div>
          {balances.length > 0 ? (
            <ul className="mb-4 grid gap-3 sm:grid-cols-2">
              {balances.map((balance) => (
                <li
                  key={`${balance.currency}-${balance.group}`}
                  className="rounded-3xl border bg-card p-4 shadow-sm"
                  style={{ borderTopWidth: 4, borderTopColor: balance.owesYou > 0 ? "#f48fb1" : "#7eb6ff" }}
                >
                  <p className="text-sm text-muted-foreground">{balance.group}</p>
                  {balance.owesYou > 0 ? (
                    <p className="mt-1 font-display text-2xl">Owes you {formatMoney(balance.owesYou, balance.currency)}</p>
                  ) : null}
                  {balance.youOwe > 0 ? (
                    <p className="mt-1 text-sm font-medium">You owe them {formatMoney(balance.youOwe, balance.currency)}</p>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : (
            <div className="mb-4 rounded-3xl border border-dashed bg-white/70 px-4 py-4 text-sm text-muted-foreground">
              No one owes you yet. Add a line, set who paid, and tick the groups sharing it.
            </div>
          )}
          {trip.budget.length === 0 ? (
            <div className="rounded-3xl border border-dashed bg-card px-4 py-8 text-sm text-muted-foreground">
              No money recorded yet. Add rooms, flights, or the activities you have already paid.
            </div>
          ) : (
            <ul className="overflow-hidden rounded-3xl border bg-card">
              {trip.budget.map((line) => {
                const shares = lineShare(line)
                return (
                  <li key={line.id} className="flex items-center justify-between gap-3 border-b px-4 py-3 last:border-b-0">
                    <button type="button" className="text-left" onClick={() => setBudgetDraft({ line, creating: false })}>
                      <span className="block text-xs text-muted-foreground">{line.category}</span>
                      <span className="block text-sm font-medium">{line.label}</span>
                      <span className="block text-xs text-muted-foreground">
                        Paid by {line.paidBy || "You"}
                        {shares.length > 0 ? ` · split ${shares.length} ways` : ""}
                      </span>
                    </button>
                    <span className="text-sm font-medium">{formatMoney(line.amount, line.currency)}</span>
                  </li>
                )
              })}
            </ul>
          )}
        </TabsContent>

        <TabsContent value="todos" className="mt-4">
          <TripTodos key={trip.id} todos={trip.todos ?? []} onChange={todos => commit({...trip, todos})} />
        </TabsContent>

        <TabsContent value="people" className="mt-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">The group for this trip. A different trip keeps its own list. Days can split by these names.</p>
            <Button type="button" onClick={() => setPersonDraft({ person: blankPerson(), creating: true })}>
              Add a person
            </Button>
          </div>
          {trip.people.length === 0 ? (
            <div className="rounded-3xl border border-dashed bg-card px-4 py-8 text-sm text-muted-foreground">
              No one is listed yet. Add the people who should recognise themselves in the plan.
            </div>
          ) : (
            <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {trip.people.map((person) => (
                <li key={person.id}>
                  <button
                    type="button"
                    onClick={() => setPersonDraft({ person, creating: false })}
                    className="w-full rounded-3xl border bg-card px-4 py-3 text-left shadow-sm hover:bg-muted"
                  >
                    <span className="flex items-center gap-2 font-medium">
                      <span className="size-2.5 rounded-full" style={{ background: trackColor(person.name) }} />
                      {person.name}
                    </span>
                    {person.note ? <span className="mt-1 block text-sm text-muted-foreground">{person.note}</span> : null}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </TabsContent>
      </Tabs>

      {stopDraft ? (
        <StopDialog
          key={stopDraft.stop.id}
          open
          creating={stopDraft.creating}
          dayTitle={trip.days.find((item) => item.id === stopDraft.dayId)?.title ?? "This day"}
          stop={stopDraft.stop}
          place={placeById(trip, stopDraft.stop.placeId)}
          people={people}
          onOpenChange={(open) => {
            if (!open) setStopDraft(null)
          }}
          onSave={saveStop}
          onDelete={stopDraft.creating ? undefined : deleteStop}
        />
      ) : null}
      {dayDraft ? (
        <DayDialog
          key={dayDraft.day.id}
          open
          creating={dayDraft.creating}
          day={dayDraft.day}
          routeSoFar={[...trip.days].filter((item) => item.id !== dayDraft.day.id).sort((left, right) => left.date.localeCompare(right.date))}
          onOpenChange={(open) => {
            if (!open) setDayDraft(null)
          }}
          onSave={saveDay}
          onDelete={
            dayDraft.creating || trip.days.length < 2
              ? undefined
              : () => {
                  const days = trip.days.filter((item) => item.id !== dayDraft.day.id)
                  commit({ ...trip, days, start: days[0].date, end: days[days.length - 1].date }, "Day removed on this device")
                  setDayId(days[0]?.id ?? "")
                  setDayDraft(null)
                }
          }
        />
      ) : null}
      {stayDraft ? (
        <StayDialog
          key={stayDraft.stay.id}
          open
          stay={stayDraft.stay}
          onOpenChange={(open) => {
            if (!open) setStayDraft(null)
          }}
          onSave={(stay) => {
            const exists = trip.stays.some((item) => item.id === stay.id)
            commit({
              ...trip,
              stays: exists ? trip.stays.map((item) => (item.id === stay.id ? stay : item)) : [...trip.stays, stay],
            })
            setStayDraft(null)
          }}
          onDelete={
            stayDraft.creating
              ? undefined
              : () => {
                  commit({ ...trip, stays: trip.stays.filter((item) => item.id !== stayDraft.stay.id) }, "Hotel removed on this device")
                  setStayDraft(null)
                }
          }
        />
      ) : null}
      {flightDraft ? (
        <FlightDialog
          key={flightDraft.flight.id}
          open
          flight={flightDraft.flight}
          groups={people}
          onOpenChange={(open) => {
            if (!open) setFlightDraft(null)
          }}
          onSave={(flight) => {
            const flights = trip.flights ?? []
            const exists = flights.some((item) => item.id === flight.id)
            commit({
              ...trip,
              flights: exists ? flights.map((item) => (item.id === flight.id ? flight : item)) : [...flights, flight],
            })
            setFlightDraft(null)
          }}
          onDelete={
            flightDraft.creating
              ? undefined
              : () => {
                  commit(
                    { ...trip, flights: (trip.flights ?? []).filter((item) => item.id !== flightDraft.flight.id) },
                    "Flight removed on this device",
                  )
                  setFlightDraft(null)
                }
          }
        />
      ) : null}
      {budgetDraft ? (
        <BudgetDialog
          key={budgetDraft.line.id}
          open
          line={budgetDraft.line}
          currency={trip.currency}
          groups={splitChoices}
          onOpenChange={(open) => {
            if (!open) setBudgetDraft(null)
          }}
          onSave={(line) => {
            const exists = trip.budget.some((item) => item.id === line.id)
            commit({
              ...trip,
              budget: exists ? trip.budget.map((item) => (item.id === line.id ? line : item)) : [...trip.budget, line],
            })
            setBudgetDraft(null)
          }}
          onDelete={
            budgetDraft.creating
              ? undefined
              : () => {
                  commit(
                    { ...trip, budget: trip.budget.filter((item) => item.id !== budgetDraft.line.id) },
                    "Line removed on this device",
                  )
                  setBudgetDraft(null)
                }
          }
        />
      ) : null}
      {personDraft ? (
        <PersonDialog
          key={personDraft.person.id}
          open
          person={personDraft.person}
          onOpenChange={(open) => {
            if (!open) setPersonDraft(null)
          }}
          onSave={(person) => {
            const exists = trip.people.some((item) => item.id === person.id)
            commit({
              ...trip,
              people: exists ? trip.people.map((item) => (item.id === person.id ? person : item)) : [...trip.people, person],
            })
            setPersonDraft(null)
          }}
          onDelete={
            personDraft.creating
              ? undefined
              : () => {
                  commit(
                    { ...trip, people: trip.people.filter((item) => item.id !== personDraft.person.id) },
                    "Person removed on this device",
                  )
                  setPersonDraft(null)
                }
          }
        />
      ) : null}
    </div>
  )
}

function flightGroupNames(trip: Trip) {
  const flights = trip.flights ?? []
  const names: string[] = []
  for (const person of trip.people) {
    if (flights.some((flight) => flight.group === person.name)) names.push(person.name)
  }
  for (const flight of flights) {
    if (!names.includes(flight.group)) names.push(flight.group)
  }
  return names
}

function StopCard({
  trip,
  stop,
  active,
  onSelect,
  onEdit,
}: {
  trip: Trip
  stop: Stop
  active: boolean
  onSelect: () => void
  onEdit: () => void
}) {
  const place = placeById(trip, stop.placeId)
  return (
    <li>
      <div className={`rounded-2xl border bg-card p-3 shadow-sm ${active ? "border-primary ring-1 ring-primary" : ""}`}>
        <button type="button" className="w-full text-left" onClick={onSelect}>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <span className="text-xs text-muted-foreground">{stop.time || "Anytime"}</span>
            <span className="flex gap-1">
              <Badge variant="outline">{kindLabel[stop.kind]}</Badge>
              <Badge variant={stop.status === "booked" ? "default" : "secondary"}>{stop.status}</Badge>
            </span>
          </div>
          <p className="mt-1 font-medium">{stop.title}</p>
          {place ? <p className="text-sm text-muted-foreground">{place.name}</p> : null}
          {stop.notes ? <p className="mt-1 text-sm leading-6 text-muted-foreground">{stop.notes}</p> : null}
        </button>
        {stop.alternatives && stop.alternatives.length > 0 ? (
          <ul className="mt-2 grid gap-1 border-l-2 border-accent pl-3 text-sm">
            {stop.alternatives.map((item) => (
              <li key={item.name}>
                <span className="font-medium">{item.name}</span>
                {item.detail ? <span className="text-muted-foreground"> — {item.detail}</span> : null}
              </li>
            ))}
          </ul>
        ) : null}
        <Button type="button" variant="ghost" size="sm" className="mt-2" onClick={onEdit}>
          Edit
        </Button>
      </div>
    </li>
  )
}

function moneySummary(trip: Trip) {
  if (trip.budget.length === 0) return "Nothing logged"
  const totals = new Map<string, number>()
  for (const line of trip.budget) {
    totals.set(line.currency, (totals.get(line.currency) ?? 0) + line.amount)
  }
  return [...totals.entries()].map(([currency, amount]) => formatMoney(amount, currency)).join(" · ")
}
