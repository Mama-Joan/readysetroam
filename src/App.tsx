import { Link, Route, Routes } from "react-router-dom"
import { HomePage } from "@/pages/HomePage"
import { PeoplePage } from "@/pages/PeoplePage"
import { TripPage } from "@/pages/TripPage"
import { TripImport } from "@/components/TripImport"
import { SharedTripPage } from "@/pages/SharedTripPage"
import { CloudAuth } from "@/components/CloudAuth"
import { Button } from "@/components/ui/button"

export default function App() {
  const token = new URLSearchParams(window.location.search).get("share")
  if (token) return <SharedTripPage token={token} />
  return (
    <div className="min-h-svh">
      <header className="sticky top-0 z-20 border-b border-white/60 bg-white/70 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <Link to="/" className="font-display text-2xl tracking-tight">
            readysetroam
          </Link>
          <CloudAuth />
          <Link to="/people" className="text-sm text-muted-foreground hover:text-foreground">
            People
          </Link>
        </div>
      </header>
      <TripImport />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/people" element={<PeoplePage />} />
        <Route path="/trip/:tripId" element={<TripPage />} />
        <Route
          path="*"
          element={
            <div className="mx-auto max-w-xl px-4 py-16">
              <h1 className="text-3xl">This page is not part of a trip.</h1>
              <Button asChild className="mt-6">
                <Link to="/">Back to the trips</Link>
              </Button>
            </div>
          }
        />
      </Routes>
    </div>
  )
}
