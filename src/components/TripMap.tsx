import { useEffect } from "react"
import L from "leaflet"
import { MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from "react-leaflet"
import "leaflet/dist/leaflet.css"

export type MapPoint = {
  stopId: string
  dayId: string
  dayLabel: string
  color: string
  lat: number
  lng: number
  title: string
  time: string
  number: number
}

function pinIcon(number: number, color: string, active: boolean) {
  return L.divIcon({
    className: "passage-pin-wrap",
    html: `<span class="passage-pin${active ? " is-active" : ""}" style="background:${color}">${number}</span>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  })
}

function lineSegments(points: MapPoint[]) {
  const segments: { color: string; positions: [number, number][] }[] = []
  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1]
    const current = points[index]
    const color = previous.dayId === current.dayId ? previous.color : current.color
    const position: [number, number] = [current.lat, current.lng]
    const last = segments[segments.length - 1]
    if (last && last.color === color) {
      last.positions.push(position)
      continue
    }
    segments.push({ color, positions: [[previous.lat, previous.lng], position] })
  }
  return segments
}

function Frame({ points, selectedId }: { points: MapPoint[]; selectedId?: string }) {
  const map = useMap()
  const signature = points.map((point) => `${point.stopId}:${point.lat.toFixed(5)}:${point.lng.toFixed(5)}`).join("|")

  useEffect(() => {
    const selected = points.find((point) => point.stopId === selectedId)
    if (selected) {
      map.flyTo([selected.lat, selected.lng], 13, { duration: 0.45 })
      return
    }
    if (points.length === 1) {
      map.setView([points[0].lat, points[0].lng], 12)
      return
    }
    map.fitBounds(
      points.map((point) => [point.lat, point.lng]),
      { padding: [36, 36], maxZoom: 11 },
    )
  }, [map, points, selectedId, signature])

  return null
}

export function TripMap({
  points,
  selectedId,
  onSelect,
}: {
  points: MapPoint[]
  selectedId?: string
  onSelect: (stopId: string, dayId: string) => void
}) {
  if (points.length === 0) {
    return (
      <div className="flex h-full min-h-72 items-center justify-center rounded-2xl border border-dashed bg-card px-6 text-center text-sm text-muted-foreground">
        No pins for this view. Add a stop and search the place name to drop one.
      </div>
    )
  }

  return (
    <div className="h-full min-h-72 overflow-hidden rounded-2xl border bg-card">
      <MapContainer
        center={[points[0].lat, points[0].lng]}
        zoom={11}
        scrollWheelZoom={false}
        className="h-full min-h-72"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Frame points={points} selectedId={selectedId} />
        {lineSegments(points).map((segment, index) => (
          <Polyline
            key={`${segment.color}-${index}`}
            positions={segment.positions}
            pathOptions={{ color: segment.color, weight: 4, opacity: 0.9 }}
          />
        ))}
        {points.map((point) => (
          <Marker
            key={point.stopId}
            position={[point.lat, point.lng]}
            icon={pinIcon(point.number, point.color, point.stopId === selectedId)}
            eventHandlers={{ click: () => onSelect(point.stopId, point.dayId) }}
          >
            <Popup>
              <div className="text-xs font-medium">{point.time}</div>
              <div className="text-sm">{point.title}</div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  )
}
