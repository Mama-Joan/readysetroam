import { useState, type ReactNode } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { searchPlaces, type GeoHit } from "@/lib/geo"
import { eachDate, formatDay, uid } from "@/lib/format"
import {
  budgetCategories,
  stopKinds,
  stopStatuses,
  type BudgetLine,
  type Day,
  type Person,
  type Place,
  type Stay,
  type Flight,
  type Stop,
  type StopKind,
  type StopStatus,
  type Trip,
} from "@/lib/types"

const kindLabels: Record<StopKind, string> = {
  flight: "Flight",
  drive: "Drive",
  meal: "Meal",
  activity: "Activity",
  stay: "Stay",
  photo: "Photo stop",
  shopping: "Shopping",
  note: "Note",
}

const statusLabels: Record<StopStatus, string> = {
  booked: "Booked",
  planned: "Planned",
  optional: "Optional",
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  )
}

export function StopDialog({
  open,
  creating = false,
  dayTitle,
  stop,
  place,
  people = [],
  onOpenChange,
  onSave,
  onDelete,
}: {
  open: boolean
  creating?: boolean
  dayTitle: string
  stop: Stop
  place?: Place
  people?: string[]
  onOpenChange: (open: boolean) => void
  onSave: (stop: Stop, place?: Place) => void
  onDelete?: () => void
}) {
  const [draft, setDraft] = useState(stop)
  const [query, setQuery] = useState(place?.name ?? "")
  const [hits, setHits] = useState<GeoHit[]>([])
  const [picked, setPicked] = useState<GeoHit | null>(null)
  const [cleared, setCleared] = useState(false)
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState("")
  const [backupText, setBackupText] = useState(
    (stop.alternatives ?? [])
      .map((item) => (item.detail ? `${item.name} — ${item.detail}` : item.name))
      .join("\n"),
  )

  async function search() {
    const term = query.trim()
    if (term.length < 2) {
      setSearchError("Type at least two letters of the place.")
      return
    }
    setSearching(true)
    setSearchError("")
    try {
      const next = await searchPlaces(term)
      setHits(next)
      if (next.length === 0) setSearchError("No match. Try the town name, or save the stop without a pin.")
    } catch {
      setSearchError("Place search is unavailable. You can still save the stop and pin it later.")
    } finally {
      setSearching(false)
    }
  }

  function save() {
    const title = draft.title.trim()
    if (!title) {
      toast.error("Give the stop a name.")
      return
    }
    const alternatives = backupText
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [name, detail] = line.split("—").map((part) => part.trim())
        return detail ? { name, detail } : { name }
      })
    let nextPlace: Place | undefined
    let placeId = cleared ? undefined : draft.placeId
    if (picked) {
      nextPlace = {
        id: uid("place"),
        name: picked.name,
        lat: picked.lat,
        lng: picked.lng,
        address: picked.detail || undefined,
      }
      placeId = nextPlace.id
    }
    onSave(
      {
        ...draft,
        title,
        placeId,
        alternatives,
        who: draft.who?.trim() || undefined,
        notes: draft.notes?.trim() || undefined,
      },
      nextPlace,
    )
    onOpenChange(false)
  }

  const currentPlace = picked?.name ?? (cleared ? "" : place?.name)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">{creating ? "Add a stop" : "Edit stop"}</DialogTitle>
          <DialogDescription>{dayTitle}. Search uses OpenStreetMap, via Photon, to place the pin.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Time">
              <Input value={draft.time} onChange={(event) => setDraft({ ...draft, time: event.target.value })} placeholder="9:30 am" />
            </Field>
            <Field label="Status">
              <Select value={draft.status} onValueChange={(status) => setDraft({ ...draft, status: status as StopStatus })}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {stopStatuses.map((status) => (
                    <SelectItem key={status} value={status}>
                      {statusLabels[status]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>
          <Field label="What happens">
            <Input value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} placeholder="Hooker Valley Track" />
          </Field>
          <Field label="Who this is for">
            <Input
              value={draft.who ?? ""}
              onChange={(event) => setDraft({ ...draft, who: event.target.value })}
              placeholder="Leave blank if the whole group is together"
              list="stop-people"
            />
            <datalist id="stop-people">
              <option value="Everyone" />
              {people.map((person) => (
                <option key={person} value={person} />
              ))}
            </datalist>
          </Field>
          <Field label="Kind">
            <Select value={draft.kind} onValueChange={(kind) => setDraft({ ...draft, kind: kind as StopKind })}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {stopKinds.map((kind) => (
                  <SelectItem key={kind} value={kind}>
                    {kindLabels[kind]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Notes">
            <Textarea value={draft.notes ?? ""} onChange={(event) => setDraft({ ...draft, notes: event.target.value })} rows={3} />
          </Field>
          <Field label="Backups, one per line">
            <Textarea
              value={backupText}
              onChange={(event) => setBackupText(event.target.value)}
              rows={3}
              placeholder={"Public Italian Kitchen — pizza and pasta"}
            />
          </Field>
          <Field label="Place on the map">
            <div className="flex gap-2">
              <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Town, hotel, or trail" />
              <Button type="button" variant="outline" onClick={() => void search()} disabled={searching}>
                {searching ? "Searching" : "Search"}
              </Button>
            </div>
          </Field>
          {currentPlace ? (
            <div className="flex items-center justify-between rounded-lg bg-secondary px-3 py-2 text-sm">
              <span>Pin: {currentPlace}</span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setPicked(null)
                  setCleared(true)
                  setQuery("")
                }}
              >
                Remove pin
              </Button>
            </div>
          ) : null}
          {searchError ? <p className="text-sm text-destructive">{searchError}</p> : null}
          {hits.length > 0 ? (
            <ul className="grid gap-1">
              {hits.map((hit) => (
                <li key={hit.id}>
                  <button
                    type="button"
                    className="w-full rounded-lg border px-3 py-2 text-left hover:bg-muted"
                    onClick={() => {
                      setPicked(hit)
                      setCleared(false)
                      setQuery(hit.name)
                      setHits([])
                    }}
                  >
                    <span className="block text-sm font-medium">{hit.name}</span>
                    {hit.detail ? <span className="block text-xs text-muted-foreground">{hit.detail}</span> : null}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
        <DialogFooter>
          {onDelete ? (
            <Button type="button" variant="destructive" onClick={onDelete}>
              Delete stop
            </Button>
          ) : null}
          <Button type="button" onClick={save}>
            Save on this device
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function blankStop(): Stop {
  return {
    id: uid("stop"),
    time: "",
    title: "",
    kind: "activity",
    status: "planned",
  }
}

export function StayDialog({
  open,
  stay,
  onOpenChange,
  onSave,
  onDelete,
}: {
  open: boolean
  stay: Stay
  onOpenChange: (open: boolean) => void
  onSave: (stay: Stay) => void
  onDelete?: () => void
}) {
  const [draft, setDraft] = useState(stay)

  function save() {
    if (!draft.name.trim()) {
      toast.error("Name the hotel.")
      return
    }
    onSave({
      ...draft,
      name: draft.name.trim(),
      who: draft.who?.trim() || undefined,
      confirmation: draft.confirmation.trim(),
      notes: draft.notes?.trim(),
    })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">Hotel</DialogTitle>
          <DialogDescription>
            A confirmation number stays in this browser. It is not part of the shared trip file until you export it.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <Field label="Name">
            <Input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} />
          </Field>
          <Field label="Who is staying">
            <Input
              value={draft.who ?? ""}
              onChange={(event) => setDraft({ ...draft, who: event.target.value })}
              placeholder="Everyone, or one group"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Check in">
              <Input type="date" value={draft.checkIn} onChange={(event) => setDraft({ ...draft, checkIn: event.target.value })} />
            </Field>
            <Field label="Check out">
              <Input type="date" value={draft.checkOut} onChange={(event) => setDraft({ ...draft, checkOut: event.target.value })} />
            </Field>
          </div>
          <Field label="Notes">
            <Textarea value={draft.notes ?? ""} onChange={(event) => setDraft({ ...draft, notes: event.target.value })} rows={3} />
          </Field>
          <Field label="Confirmation, on this device only">
            <Input
              value={draft.confirmation}
              onChange={(event) => setDraft({ ...draft, confirmation: event.target.value })}
              autoComplete="off"
              placeholder="Leave blank on anything you publish"
            />
          </Field>
        </div>
        <DialogFooter>
          {onDelete ? (
            <Button type="button" variant="destructive" onClick={onDelete}>
              Delete hotel
            </Button>
          ) : null}
          <Button type="button" onClick={save}>
            Save on this device
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function blankStay(currencyDate: string): Stay {
  return {
    id: uid("stay"),
    name: "",
    checkIn: currencyDate,
    checkOut: currencyDate,
    confirmation: "",
  }
}

export function BudgetDialog({
  open,
  line,
  currency,
  groups = [],
  onOpenChange,
  onSave,
  onDelete,
}: {
  open: boolean
  line: BudgetLine
  currency: string
  groups?: string[]
  onOpenChange: (open: boolean) => void
  onSave: (line: BudgetLine) => void
  onDelete?: () => void
}) {
  const [draft, setDraft] = useState(line)
  const [amount, setAmount] = useState(String(line.amount || ""))
  const [payer, setPayer] = useState(line.paidBy || "You")
  const [splitGroups, setSplitGroups] = useState<string[]>(line.splitGroups ?? [])
  const [groupName, setGroupName] = useState("")
  const choices = ["You", ...groups.filter((group) => group && group !== "You")]

  function save() {
    const value = Number(amount)
    if (!draft.label.trim() || !Number.isFinite(value) || value < 0) {
      toast.error("Add a label and an amount of zero or more.")
      return
    }
    onSave({
      ...draft,
      label: draft.label.trim(),
      amount: value,
      currency: draft.currency || currency,
      paidBy: payer.trim() || "You",
      splitGroups,
    })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">Budget line</DialogTitle>
          <DialogDescription>
            Tick the groups who share the cost. What they owe you stays in this browser, not in the published trip.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <Field label="Category">
            <Select value={draft.category} onValueChange={(category) => setDraft({ ...draft, category })}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {budgetCategories.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Label">
            <Input value={draft.label} onChange={(event) => setDraft({ ...draft, label: event.target.value })} placeholder="Car hire, 8 days" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Amount">
              <Input inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} />
            </Field>
            <Field label="Currency">
              <Input value={draft.currency} onChange={(event) => setDraft({ ...draft, currency: event.target.value.toUpperCase() })} maxLength={3} />
            </Field>
          </div>
          <Field label="Who paid">
            <Input value={payer} onChange={(event) => setPayer(event.target.value)} placeholder="You" list="payer-groups" />
          </Field>
          <Field label="Split equally between">
            <div className="flex flex-wrap gap-1.5">
              {choices.map((group) => {
                const on = splitGroups.includes(group)
                return (
                  <button
                    key={group}
                    type="button"
                    onClick={() =>
                      setSplitGroups((current) => (current.includes(group) ? current.filter((item) => item !== group) : [...current, group]))
                    }
                    className={`rounded-full border px-2.5 py-1 text-xs ${on ? "border-primary bg-primary text-primary-foreground" : "bg-card"}`}
                  >
                    {group}
                  </button>
                )
              })}
            </div>
            <div className="mt-2 flex gap-2">
              <Input value={groupName} onChange={(event) => setGroupName(event.target.value)} placeholder="Add another group" />
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  const name = groupName.trim()
                  if (!name) return
                  setSplitGroups((current) => (current.includes(name) ? current : [...current, name]))
                  setGroupName("")
                }}
              >
                Add
              </Button>
            </div>
            {splitGroups.length > 0 ? (
              <p className="text-xs text-muted-foreground">
                {splitGroups.join(", ")} share this evenly. Anyone other than the payer owes their part.
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">Leave this empty if the line is only a group total.</p>
            )}
            <datalist id="payer-groups">
              {choices.map((group) => (
                <option key={group} value={group} />
              ))}
            </datalist>
          </Field>
        </div>
        <DialogFooter>
          {onDelete ? (
            <Button type="button" variant="destructive" onClick={onDelete}>
              Delete line
            </Button>
          ) : null}
          <Button type="button" onClick={save}>
            Save on this device
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function blankBudget(currency: string): BudgetLine {
  return { id: uid("budget"), category: "Other", label: "", amount: 0, currency, paidBy: "You", splitGroups: [] }
}

export function PersonDialog({
  open,
  person,
  onOpenChange,
  onSave,
  onDelete,
}: {
  open: boolean
  person: Person
  onOpenChange: (open: boolean) => void
  onSave: (person: Person) => void
  onDelete?: () => void
}) {
  const [draft, setDraft] = useState(person)

  function save() {
    if (!draft.name.trim()) {
      toast.error("Add a name, or a role such as Child.")
      return
    }
    onSave({ ...draft, name: draft.name.trim(), note: draft.note?.trim() || undefined })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">Person</DialogTitle>
          <DialogDescription>First names are enough. This list is part of the trip you share.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <Field label="Name">
            <Input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} />
          </Field>
          <Field label="Note">
            <Input value={draft.note ?? ""} onChange={(event) => setDraft({ ...draft, note: event.target.value })} placeholder="Flight group, age, driver" />
          </Field>
        </div>
        <DialogFooter>
          {onDelete ? (
            <Button type="button" variant="destructive" onClick={onDelete}>
              Remove
            </Button>
          ) : null}
          <Button type="button" onClick={save}>
            Save on this device
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function blankPerson(): Person {
  return { id: uid("person"), name: "" }
}

export function TripDialog({
  open,
  onOpenChange,
  onCreate,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreate: (trip: Trip) => void
}) {
  const [title, setTitle] = useState("")
  const [destination, setDestination] = useState("")
  const [start, setStart] = useState("")
  const [end, setEnd] = useState("")
  const [party, setParty] = useState("")
  const [currency, setCurrency] = useState("SGD")
  const [error, setError] = useState("")

  function create() {
    if (!title.trim() || !destination.trim() || !start || !end) {
      setError("Add a name, a destination, and both dates.")
      return
    }
    if (end < start) {
      setError("The last day needs to be on or after the first day.")
      return
    }
    const dates = eachDate(start, end)
    const days: Day[] = dates.map((date, index) => ({
      id: uid("day"),
      date,
      label: `Day ${index + 1}`,
      title: index === 0 ? "Arrival" : "Open day",
      route: "",
      stops: [],
    }))
    onCreate({
      id: uid("trip"),
      title: title.trim(),
      destination: destination.trim(),
      summary: party.trim() ? `Travelling with ${party.trim()}.` : "A new trip. Add the days as you book them.",
      start: dates[0],
      end: dates[dates.length - 1],
      party: party.trim() || "Add who is coming",
      currency,
      links: [],
      people: [],
      places: [],
      days,
      stays: [],
      budget: [],
    })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">New trip</DialogTitle>
          <DialogDescription>
            Up to 21 days are created for you. Anything you add is saved in this browser until you publish a new version.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <Field label="Trip name">
            <Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Penang with the cousins" />
          </Field>
          <Field label="Destination">
            <Input value={destination} onChange={(event) => setDestination(event.target.value)} placeholder="Penang" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="First day">
              <Input type="date" value={start} onChange={(event) => setStart(event.target.value)} />
            </Field>
            <Field label="Last day">
              <Input type="date" value={end} onChange={(event) => setEnd(event.target.value)} />
            </Field>
          </div>
          <Field label="Who is going">
            <Input value={party} onChange={(event) => setParty(event.target.value)} placeholder="6 adults, 2 children" />
          </Field>
          <Field label="Currency">
            <Select value={currency} onValueChange={setCurrency}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {["SGD", "JPY", "NZD", "MYR", "USD", "AUD", "EUR"].map((code) => (
                  <SelectItem key={code} value={code}>
                    {code}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </div>
        <DialogFooter>
          <Button type="button" onClick={create}>
            Create the trip
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function DayDialog({
  open,
  creating,
  day,
  routeSoFar,
  onOpenChange,
  onSave,
  onDelete,
}: {
  open: boolean
  creating: boolean
  day: Day
  routeSoFar: Day[]
  onOpenChange: (open: boolean) => void
  onSave: (day: Day) => void
  onDelete?: () => void
}) {
  const [draft, setDraft] = useState(day)

  function save() {
    if (!draft.date) {
      toast.error("Choose the date.")
      return
    }
    if (!draft.title.trim() && !draft.route.trim()) {
      toast.error("Add a heading or a route for this day.")
      return
    }
    onSave({
      ...draft,
      label: draft.label.trim() || "Day",
      title: draft.title.trim() || draft.route.trim(),
      route: draft.route.trim(),
      transport: draft.transport?.trim() || undefined,
      warning: draft.warning?.trim() || undefined,
    })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">{creating ? "Add a day" : "Edit this day"}</DialogTitle>
          <DialogDescription>The route so far is below. Set this day's heading and the route you want on the header.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="rounded-2xl bg-secondary/70 px-3 py-3">
            <p className="text-xs font-medium tracking-wide text-secondary-foreground uppercase">Route so far</p>
            {routeSoFar.length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">This is the first day. The route starts here.</p>
            ) : (
              <ol className="mt-2 grid gap-1.5">
                {routeSoFar.map((item) => (
                  <li key={item.id} className="text-sm">
                    <span className="text-muted-foreground">{item.label} · {formatDay(item.date)} · </span>
                    <span className="font-medium">{item.route || item.title}</span>
                  </li>
                ))}
              </ol>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Date">
              <Input type="date" value={draft.date} onChange={(event) => setDraft({ ...draft, date: event.target.value })} />
            </Field>
            <Field label="Day label">
              <Input value={draft.label} onChange={(event) => setDraft({ ...draft, label: event.target.value })} placeholder="Day 4" />
            </Field>
          </div>
          <Field label="Heading">
            <Input
              value={draft.title}
              onChange={(event) => setDraft({ ...draft, title: event.target.value })}
              placeholder="Meet in Otaru"
            />
          </Field>
          <Field label="Route for this day">
            <Input
              value={draft.route}
              onChange={(event) => setDraft({ ...draft, route: event.target.value })}
              placeholder="Kiroro / Hakodate → Otaru"
            />
          </Field>
          <Field label="How you get there">
            <Input
              value={draft.transport ?? ""}
              onChange={(event) => setDraft({ ...draft, transport: event.target.value })}
              placeholder="Drive, train, or a transfer"
            />
          </Field>
          <Field label="Watch-outs">
            <Textarea
              value={draft.warning ?? ""}
              onChange={(event) => setDraft({ ...draft, warning: event.target.value })}
              rows={2}
              placeholder="Short daylight, icy road, last entry"
            />
          </Field>
        </div>
        <DialogFooter>
          {onDelete ? (
            <Button type="button" variant="destructive" onClick={onDelete}>
              Delete day
            </Button>
          ) : null}
          <Button type="button" onClick={save}>
            Save on this device
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function blankFlight(group = ""): Flight {
  return {
    id: uid("flight"),
    group,
    from: "",
    to: "",
    departDate: "",
    departTime: "",
    arriveDate: "",
    arriveTime: "",
  }
}

export function FlightDialog({
  open,
  flight,
  groups,
  onOpenChange,
  onSave,
  onDelete,
}: {
  open: boolean
  flight: Flight
  groups: string[]
  onOpenChange: (open: boolean) => void
  onSave: (flight: Flight) => void
  onDelete?: () => void
}) {
  const [draft, setDraft] = useState(flight)

  function save() {
    if (!draft.group.trim() || !draft.from.trim() || !draft.to.trim()) {
      toast.error("Add who is flying, and both ends of the route.")
      return
    }
    onSave({
      ...draft,
      group: draft.group.trim(),
      from: draft.from.trim(),
      to: draft.to.trim(),
      departTime: draft.departTime.trim(),
      arriveTime: draft.arriveTime.trim(),
      number: draft.number?.trim() || undefined,
      notes: draft.notes?.trim() || undefined,
    })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">Flight</DialogTitle>
          <DialogDescription>One leg for one group. A connection is a second flight.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <Field label="Flight group">
            <Input value={draft.group} onChange={(event) => setDraft({ ...draft, group: event.target.value })} list="flight-groups" placeholder="Joan" />
            <datalist id="flight-groups">
              {groups.map((group) => (
                <option key={group} value={group} />
              ))}
            </datalist>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="From">
              <Input value={draft.from} onChange={(event) => setDraft({ ...draft, from: event.target.value })} placeholder="New Chitose (CTS)" />
            </Field>
            <Field label="To">
              <Input value={draft.to} onChange={(event) => setDraft({ ...draft, to: event.target.value })} placeholder="Narita (NRT)" />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Depart date">
              <Input type="date" value={draft.departDate} onChange={(event) => setDraft({ ...draft, departDate: event.target.value })} />
            </Field>
            <Field label="Depart time">
              <Input value={draft.departTime} onChange={(event) => setDraft({ ...draft, departTime: event.target.value })} placeholder="1:40pm" />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Arrive date">
              <Input type="date" value={draft.arriveDate} onChange={(event) => setDraft({ ...draft, arriveDate: event.target.value })} />
            </Field>
            <Field label="Arrive time">
              <Input value={draft.arriveTime} onChange={(event) => setDraft({ ...draft, arriveTime: event.target.value })} placeholder="3:30pm" />
            </Field>
          </div>
          <Field label="Flight number">
            <Input value={draft.number ?? ""} onChange={(event) => setDraft({ ...draft, number: event.target.value })} placeholder="Optional" />
          </Field>
          <Field label="Notes">
            <Textarea value={draft.notes ?? ""} onChange={(event) => setDraft({ ...draft, notes: event.target.value })} rows={2} />
          </Field>
        </div>
        <DialogFooter>
          {onDelete ? (
            <Button type="button" variant="destructive" onClick={onDelete}>
              Delete flight
            </Button>
          ) : null}
          <Button type="button" onClick={save}>
            Save on this device
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
