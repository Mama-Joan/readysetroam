export type GeoHit = {
  id: string
  name: string
  detail: string
  lat: number
  lng: number
}

type PhotonFeature = {
  geometry?: { coordinates?: [number, number] }
  properties?: {
    osm_id?: number
    name?: string
    street?: string
    housenumber?: string
    city?: string
    state?: string
    country?: string
  }
}

export async function searchPlaces(query: string): Promise<GeoHit[]> {
  const url = new URL("https://photon.komoot.io/api/")
  url.searchParams.set("q", query)
  url.searchParams.set("limit", "5")
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error("Place search is unavailable right now.")
  }
  const data = (await response.json()) as { features?: PhotonFeature[] }
  return (data.features ?? [])
    .map((feature) => {
      const [lng, lat] = feature.geometry?.coordinates ?? []
      if (typeof lat !== "number" || typeof lng !== "number") return null
      const props = feature.properties ?? {}
      const name = props.name || [props.housenumber, props.street].filter(Boolean).join(" ")
      if (!name) return null
      const detail = [props.street, props.city, props.state, props.country]
        .filter((part, index, all) => part && all.indexOf(part) === index && part !== name)
        .join(", ")
      return {
        id: String(props.osm_id ?? `${lat},${lng}`),
        name,
        detail,
        lat,
        lng,
      }
    })
    .filter((hit): hit is GeoHit => hit !== null)
}
