import { useState } from "react"
import { Link } from "react-router-dom"
import { toast } from "sonner"
import { CloudTripsPanel } from "@/components/CloudTripsPanel"
import { TripDialog } from "@/components/editors"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { cardWash } from "@/lib/colors"
import { formatRange, tripTiming } from "@/lib/format"
import { useTrips } from "@/lib/store"
import type { Trip } from "@/lib/types"

const timingLabel = {
  upcoming: "Coming up",
  "on-trip": "On the road",
  past: "Past trip",
} as const

export function HomePage() {
  const { trips, addTrip, cloud, busy } = useTrips()
  const ordered = [...trips].sort((left, right) => right.start.localeCompare(left.start))
  const [creating, setCreating] = useState(false)
  const [exportOpen, setExportOpen] = useState(false)

  function download() {
    const blob = new Blob([JSON.stringify({ trips }, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = "readysetroam-trips.json"
    link.click()
    URL.revokeObjectURL(url)
    setExportOpen(false)
    toast.success("Downloaded. Remove confirmation numbers before a public upload.")
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:py-12">
      <div className="max-w-2xl">
        <p className="text-xs font-medium tracking-[0.18em] text-primary uppercase">Trips Home</p>
        <h1 className="mt-2 text-4xl text-balance sm:text-5xl">Making memories, one trip at a time.</h1>
        <p className="mt-4 max-w-xl text-base text-muted-foreground">
          Hokkaido, South Island, and Ipoh already live here. Open one for the days, the coloured route, the hotels, the flights, and who owes what.
        </p>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {ordered.map((trip, index) => (
          <TripCard key={trip.id} trip={trip} wash={cardWash(index)} />
        ))}
        <button
          type="button"
          disabled={busy} onClick={() => setCreating(true)}
          className="flex min-h-52 flex-col items-start justify-between rounded-3xl border border-dashed bg-white/70 p-5 text-left hover:bg-card"
        >
          <span className="font-display text-2xl">New trip</span>
          <span className="text-sm text-muted-foreground">A blank set of days for the next group. {cloud ? "Saved to cloud." : "Saved on this device."}</span>
        </button>
      </div>

      <div className="mt-8 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
        <Button type="button" variant="outline" onClick={() => setExportOpen(true)}>
          Download trip file
        </Button>
        <p>{cloud ? "Private cloud trips. Download for backup only." : "Changes stay in this browser."}</p>
      </div>

      <CloudTripsPanel />

      {creating ? (
        <TripDialog
          open
          onOpenChange={setCreating}
          onCreate={(trip) => {
            void addTrip(trip).then(() => toast.success(cloud ? "Trip created in cloud" : "Trip created on this device")).catch(e => toast.error(String(e.message ?? e)))
          }}
        />
      ) : null}

      <Dialog open={exportOpen} onOpenChange={setExportOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display text-xl">Download the trips</DialogTitle>
            <DialogDescription>
              The file includes confirmation numbers and any group balances you typed in. Delete those before you commit the file to a public repository.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" onClick={download}>
              Download JSON
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function TripCard({ trip, wash }: { trip: Trip; wash: string }) {
  const timing = tripTiming(trip)
  return (
    <Link
      to={`/trip/${trip.id}`}
      className="flex min-h-52 flex-col justify-between rounded-3xl border bg-card p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
      style={{ background: `linear-gradient(165deg, #ffffff 20%, ${wash})` }}
    >
      <div>
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-medium tracking-wide text-primary uppercase">{trip.destination}</p>
          <Badge variant={timing === "past" ? "secondary" : "default"}>{timingLabel[timing]}</Badge>
        </div>
        <h2 className="mt-3 text-2xl">{trip.title}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{trip.summary}</p>
      </div>
      <div className="mt-6 text-sm">
        <p>{formatRange(trip.start, trip.end)}</p>
        <p className="text-muted-foreground">{trip.party}</p>
      </div>
    </Link>
  )
}
