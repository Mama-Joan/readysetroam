import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { BrowserRouter } from "react-router-dom"
import { Toaster } from "@/components/ui/sonner"
import { TripsProvider } from "@/lib/store"
import App from "@/App"
import "./index.css"

const basename = import.meta.env.BASE_URL.replace(/\/$/, "")

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter basename={basename}>
      <TripsProvider>
        <App />
        <Toaster />
      </TripsProvider>
    </BrowserRouter>
  </StrictMode>,
)
