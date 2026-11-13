import { useEffect,useState } from "react"
import { supabase } from "@/lib/supabase"
type Item = Record<string,unknown>
type Shared = {title:string;destination:string;start:string;end:string;days:Item[];stays:Item[];flights:Item[];todos:Item[];places:Item[];budget:Item[];people:Item[]}
export function SharedTripPage({token}:{token:string}) {
 const [trip,setTrip]=useState<Shared|null>(null)
 const [status,setStatus]=useState("Loading trip…")
 useEffect(()=>{let active=true;supabase.rpc("shared_trip",{p_token:token}).then(({data,error})=>{if(!active)return;if(error||!data){setStatus("This trip link is unavailable.");return}setTrip(data as Shared)});return()=>{active=false}},[token])
 if(!trip)return <main className="mx-auto max-w-xl p-8">{status}</main>
 const groups:[string,Item[],string[]][]=[["Accommodation",trip.stays,["name","checkIn","checkOut"]],["Flights",trip.flights,["number","from","to","departDate","departTime","arriveDate","arriveTime"]],["To-dos",trip.todos,["title","due"]],["Locations",trip.places,["name","address"]],["Expenses",trip.budget,["label","currency","amount"]],["Travellers",trip.people,["name"]]]
 return <main className="mx-auto max-w-3xl space-y-5 p-5"><p>readysetroam · Shared trip · View only</p><h1 className="text-3xl">{trip.title}</h1><p>{trip.destination} · {trip.start} to {trip.end}</p><button className="underline" onClick={()=>window.location.reload()}>Refresh latest plan</button>
 {trip.days.map((day,i)=><section key={i} className="rounded-xl border bg-white p-4"><h2 className="text-xl">{String(day.date)} · {String(day.title)}</h2>{(day.stops as Item[]).map((s,j)=><p key={j} className="py-2">{String(s.time??"")} · {String(s.title??"")} · {String(s.status??"")}</p>)}</section>)}
 {groups.filter(([,items])=>items.length).map(([title,items,keys])=><section key={title} className="rounded-xl border bg-white p-4"><h2 className="text-xl">{title}</h2>{items.map((x,i)=><p key={i} className="py-2">{title==="To-dos"?(x.done?"✓ ":"○ "):""}{keys.map(k=>x[k]).filter(v=>v!=null&&v!=="").map(String).join(" · ")}</p>)}</section>)}</main>
}
