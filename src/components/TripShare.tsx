import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
const choices = [["days","Daily itinerary"],["stays","Accommodation"],["flights","Flights"],["todos","To-dos"],["places","Locations"],["budget","Expense amounts"],["people","Traveller names"]]
export function TripShare({ tripId }: { tripId: string }) {
  const [sections,setSections] = useState(["days","stays","flights","todos","places"])
  const [token,setToken] = useState("")
  const [error,setError] = useState("")
  const [busy,setBusy] = useState(true)
  useEffect(() => {
    let active = true
    supabase.from("trip_shares").select("token,sections").eq("trip_id",tripId).maybeSingle().then(({data,error}) => {
      if (!active) return
      if (error) setError(error.message)
      if (data) { setToken(data.token); setSections(data.sections) }
      setBusy(false)
    })
    return () => { active=false }
  },[tripId])
  async function save(revoke=false) {
    setBusy(true);setError("")
    try {
      const {data:{user}}=await supabase.auth.getUser()
      if (!user) throw new Error("Sign in first")
      if (revoke) {
        const {error}=await supabase.from("trip_shares").delete().eq("owner_id",user.id).eq("trip_id",tripId)
        if(error) throw error
        setToken("")
      } else {
        const {data,error}=await supabase.from("trip_shares").upsert({owner_id:user.id,trip_id:tripId,sections},{onConflict:"owner_id,trip_id"}).select("token").single()
        if(error) throw error
        setToken(data.token)
      }
    } catch(e) {setError(String((e as {message?:string}).message ?? e))}
    finally {setBusy(false)}
  }
  const url = new URL(import.meta.env.BASE_URL,window.location.origin)
  url.searchParams.set("share",token)
  return <details className="my-4 rounded-xl border p-4">
    <summary className="cursor-pointer font-medium">Share your trip</summary>
    <p className="text-sm">Anyone with the link can view selected fields. Review titles and names for sensitive information before sharing. Notes and confirmation fields are excluded.</p>
    {choices.map(([id,label])=><label key={id} className="flex gap-2 py-1"><input type="checkbox" disabled={busy} checked={sections.includes(id)} onChange={e=>setSections(old=>e.target.checked?[...old,id]:old.filter(x=>x!==id))}/>{label}</label>)}
    <Button disabled={busy} onClick={()=>void save()}>{token?"Save sharing settings":"Generate shareable link"}</Button>
    {token && <div className="mt-3 space-y-2"><input className="w-full border p-2" readOnly value={url.href}/><Button variant="outline" onClick={()=>navigator.clipboard.writeText(url.href).catch(()=>setError("Copy the link manually"))}>Copy link</Button> <Button variant="outline" disabled={busy} onClick={()=>{if(window.confirm("Revoke this link?"))void save(true)}}>Revoke link</Button></div>}
    {error && <p role="alert">{error}</p>}
  </details>
}
