import { Link, Route, Routes } from "react-router-dom"
import { HomePage } from "@/pages/HomePage"
import { TripPage } from "@/pages/TripPage"
import { Button } from "@/components/ui/button"

export default function App() {
  return (
    <div className="min-h-svh">
      <header className="sticky top-0 z-20 border-b border-white/60 bg-white/70 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <Link to="/" className="font-display text-2xl tracking-tight">
            Passage
          </Link>
          <p className="hidden text-sm text-muted-foreground sm:block">Plans for the people you travel with</p>
        </div>
      </header>
      <Routes>
        <Route path="/" element={<HomePage />} />
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
