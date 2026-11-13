import { useState } from "react"
import { Link } from "react-router-dom"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useTrips } from "@/lib/store"
import type { Trip } from "@/lib/types"

const PROFILE_KEY = "readysetroam.profiles.v1"

type ProfileNote = { note: string }

function loadNotes(): Record<string, ProfileNote> {
  try {
    const raw = localStorage.getItem(PROFILE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as Record<string, ProfileNote>
    return parsed && typeof parsed === "object" ? parsed : {}
  } catch {
    return {}
  }
}

type Profile = {
  name: string
  note: string
  trips: Trip[]
}

function profilesFrom(trips: Trip[], notes: Record<string, ProfileNote>): Profile[] {
  const byName = new Map<string, Profile>()
  for (const trip of trips) {
    for (const person of trip.people) {
      const existing = byName.get(person.name)
      const seeded = person.note ?? ""
      if (!existing) {
        byName.set(person.name, {
          name: person.name,
          note: notes[person.name]?.note ?? seeded,
          trips: [trip],
        })
        continue
      }
      if (!existing.trips.some((item) => item.id === trip.id)) existing.trips.push(trip)
      if (!existing.note && seeded) existing.note = notes[person.name]?.note ?? seeded
    }
  }
  return [...byName.values()].sort((left, right) => left.name.localeCompare(right.name))
}

export function PeoplePage() {
  const { trips } = useTrips()
  const [notes, setNotes] = useState<Record<string, ProfileNote>>(loadNotes)
  const [editing, setEditing] = useState<string | null>(null)
  const [draft, setDraft] = useState("")
  const profiles = profilesFrom(trips, notes)

  function save(name: string) {
    const next = { ...notes, [name]: { note: draft.trim() } }
    setNotes(next)
    localStorage.setItem(PROFILE_KEY, JSON.stringify(next))
    setEditing(null)
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <Button asChild variant="outline" size="sm">
        <Link to="/">
          <ArrowLeft />
          Back
        </Link>
      </Button>
      <p className="mt-4 text-xs font-medium tracking-[0.18em] text-primary uppercase">People</p>
      <h1 className="mt-2 text-4xl">The people who travel with you</h1>
      <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
        Names and trip notes live with the published plan. Anything you add in the profile box stays in this browser.
      </p>
      {profiles.length === 0 ? (
        <div className="mt-6 rounded-3xl border border-dashed bg-card px-4 py-8 text-sm text-muted-foreground">
          No one is on a trip yet.
        </div>
      ) : (
        <ul className="mt-6 grid gap-3 sm:grid-cols-2">
          {profiles.map((profile) => (
            <li key={profile.name} className="rounded-3xl border bg-card p-4 shadow-sm">
              <h2 className="text-xl">{profile.name}</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {profile.trips.map((trip) => trip.title).join(" · ")}
              </p>
              {editing === profile.name ? (
                <div className="mt-3 grid gap-2">
                  <textarea
                    className="min-h-24 rounded-xl border bg-background px-3 py-2 text-sm"
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                  />
                  <div className="flex gap-2">
                    <Button type="button" size="sm" onClick={() => save(profile.name)}>
                      Save on this device
                    </Button>
                    <Button type="button" size="sm" variant="ghost" onClick={() => setEditing(null)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <p className="mt-3 text-sm leading-6">{profile.note || "No profile note yet."}</p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="mt-2"
                    onClick={() => {
                      setEditing(profile.name)
                      setDraft(profile.note)
                    }}
                  >
                    Edit profile
                  </Button>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
