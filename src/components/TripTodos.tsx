import { useState } from "react"
import { Button } from "@/components/ui/button"
import type { Todo } from "@/lib/types"

const categories = ["Bookings", "Documents", "Preparation", "Connectivity", "Activities", "Packing", "Other"]
const blank = (): Todo => ({ id: crypto.randomUUID(), title: "", done: false, category: "Preparation" })
const localDate = () => {
  const d = new Date()
  return [d.getFullYear(), String(d.getMonth()+1).padStart(2,"0"), String(d.getDate()).padStart(2,"0")].join("-")
}
export function TripTodos({ todos, onChange }: { todos: Todo[]; onChange: (todos: Todo[]) => void }) {
  const [draft, setDraft] = useState<Todo | null>(null)
  const [filter, setFilter] = useState("all")
  const completed = todos.filter(t => t.done).length
  const visible = todos.filter(t => filter === "all" || (filter === "done" ? t.done : !t.done))
    .sort((a,b) => Number(a.done)-Number(b.done) || (a.due || "9999").localeCompare(b.due || "9999"))
  const field = (key: "title" | "category" | "due" | "who" | "notes", value: string) =>
    setDraft(old => old ? {...old, [key]: value} : null)
  return <section className="space-y-4">
    <div className="rounded-3xl border bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h2 className="text-2xl">Trip checklist</h2><p className="text-sm text-muted-foreground">{completed} of {todos.length} completed</p></div>
        <Button type="button" onClick={() => setDraft(blank())}>Add a to-do</Button>
      </div>
      <progress className="mt-3 w-full accent-primary" aria-label="Checklist progress" max={todos.length || 1} value={completed}/>
      <div className="mt-3 flex flex-wrap gap-2">{["all","open","done"].map(f => <Button key={f} type="button" size="sm" variant={filter === f ? "default" : "outline"} onClick={() => setFilter(f)}>{f === "all" ? "All" : f === "open" ? "Outstanding" : "Completed"}</Button>)}</div>
    </div>
    {draft && <form className="rounded-3xl border bg-card p-4 space-y-3" onSubmit={e => {
      e.preventDefault()
      if (!draft.title.trim()) return
      const next = {...draft, title: draft.title.trim()}
      onChange(todos.some(t => t.id === next.id) ? todos.map(t => t.id === next.id ? next : t) : [...todos,next])
      setDraft(null)
    }}>
      <h3 className="text-lg font-medium">{todos.some(t => t.id === draft.id) ? "Edit to-do" : "New to-do"}</h3>
      <label className="block text-sm">Task<input required maxLength={200} className="block w-full rounded-lg border bg-background p-2" value={draft.title} onChange={e => field("title",e.target.value)}/></label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm">Category<select className="block w-full rounded-lg border bg-background p-2" value={draft.category || "Other"} onChange={e => field("category",e.target.value)}>{[...new Set([...categories,draft.category || "Other"])].map(c => <option key={c}>{c}</option>)}</select></label>
        <label className="block text-sm">Due date (optional)<input type="date" className="block w-full rounded-lg border bg-background p-2" value={draft.due || ""} onChange={e => field("due",e.target.value)}/></label>
      </div>
      <label className="block text-sm">Assigned to (optional)<input maxLength={200} className="block w-full rounded-lg border bg-background p-2" value={draft.who || ""} onChange={e => field("who",e.target.value)}/></label>
      <label className="block text-sm">Notes (optional)<textarea maxLength={10000} className="block w-full rounded-lg border bg-background p-2" value={draft.notes || ""} onChange={e => field("notes",e.target.value)}/></label>
      <div className="flex gap-2"><Button type="submit">Save to-do</Button><Button type="button" variant="outline" onClick={() => setDraft(null)}>Cancel</Button></div>
    </form>}
    {visible.length === 0 && <p className="rounded-3xl border border-dashed bg-card p-6 text-sm text-muted-foreground">No to-dos in this view.</p>}
    <ul className="space-y-2">{visible.map(t => <li key={t.id} className="rounded-2xl border bg-card p-3">
      <div className="flex flex-wrap items-start gap-3">
        <input type="checkbox" className="mt-1 size-5 accent-primary" aria-label={"Complete " + t.title} checked={t.done} onChange={e => {onChange(todos.map(x => x.id === t.id ? {...x,done:e.target.checked} : x)); if (draft?.id === t.id) setDraft(null)}}/>
        <div className="min-w-0 flex-1">
          <p className={t.done ? "line-through text-muted-foreground" : "font-medium"}>{t.title}</p>
          <p className="text-xs text-muted-foreground">{[t.category,t.who,t.due ? "Due " + t.due : ""].filter(Boolean).join(" · ")}</p>
          {!t.done && t.due && t.due < localDate() && <p className="text-xs font-medium text-rose-700">Overdue</p>}
          {t.notes && <p className="mt-1 whitespace-pre-wrap break-words text-sm">{t.notes}</p>}
        </div>
        <Button type="button" size="sm" variant="ghost" onClick={() => setDraft({...t})}>Edit</Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => {if (window.confirm("Delete this to-do?")) {onChange(todos.filter(x => x.id !== t.id)); if (draft?.id === t.id) setDraft(null)}}}>Delete</Button>
      </div>
    </li>)}</ul>
  </section>
}
