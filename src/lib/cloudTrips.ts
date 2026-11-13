import { supabase } from "./supabase"
import { validateTrip } from "./tripImport"
import type { Trip } from "./types"

export type CloudTrip = { id: string; data: Trip; version: number; updated_at: string }

async function owner() {
  const { data, error } = await supabase.auth.getUser()
  if (error || !data.user) throw new Error("Sign in before accessing cloud trips")
  return data.user.id
}

export async function listCloudTrips(): Promise<CloudTrip[]> {
  const owner_id = await owner()
  const { data, error } = await supabase.from("trips").select("id,data,version,updated_at").eq("owner_id", owner_id)
  if (error) throw error
  return (data ?? []).map(row => ({ ...row, data: validateTrip(row.data) }))
}

export async function createCloudTrip(trip: Trip): Promise<void> {
  const owner_id = await owner()
  const { error } = await supabase.from("trips").insert({ owner_id, id: trip.id, data: validateTrip(trip) })
  if (error) throw error
}

export async function updateCloudTrip(trip: Trip, version: number): Promise<void> {
  const owner_id = await owner()
  const { data, error } = await supabase.from("trips").update({ data: validateTrip(trip) })
    .eq("owner_id", owner_id).eq("id", trip.id).eq("version", version).select("id")
  if (error) throw error
  if (data?.length !== 1) throw new Error("Cloud trip changed or was removed. Refresh before retrying.")
}
