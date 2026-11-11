export const stopKinds = [
  "flight",
  "drive",
  "meal",
  "activity",
  "stay",
  "photo",
  "shopping",
  "note",
] as const

export type StopKind = (typeof stopKinds)[number]

export const stopStatuses = ["booked", "planned", "optional"] as const

export type StopStatus = (typeof stopStatuses)[number]

export type Alternative = {
  name: string
  detail?: string
}

export type Place = {
  id: string
  name: string
  lat: number
  lng: number
  address?: string
  /** Far-away airports stay off the map so a day does not zoom out to another country. */
  plot?: boolean
}

export type Stop = {
  id: string
  time: string
  title: string
  kind: StopKind
  status: StopStatus
  placeId?: string
  /** Whose plan this stop belongs to. Empty means the whole group. */
  who?: string
  notes?: string
  alternatives?: Alternative[]
}

export type Day = {
  id: string
  date: string
  label: string
  title: string
  route: string
  warning?: string
  transport?: string
  stops: Stop[]
}

export type Stay = {
  id: string
  name: string
  placeId?: string
  checkIn: string
  checkOut: string
  /** Whose bed this is. "Everyone" covers the whole party. */
  who?: string
  notes?: string
  confirmation: string
}

export type Person = {
  id: string
  name: string
  note?: string
}

export type BudgetLine = {
  id: string
  category: string
  label: string
  amount: number
  currency: string
  /** Who paid this. "You" is the person keeping the ledger. */
  paidBy?: string
  /** Groups sharing the cost in equal parts, including the payer when they share it. */
  splitGroups?: string[]
}

export type Flight = {
  id: string
  group: string
  from: string
  to: string
  departDate: string
  departTime: string
  arriveDate: string
  arriveTime: string
  number?: string
  notes?: string
}

export type TripLink = {
  label: string
  href: string
}

export type Trip = {
  id: string
  title: string
  destination: string
  summary: string
  start: string
  end: string
  party: string
  currency: string
  links: TripLink[]
  people: Person[]
  places: Place[]
  days: Day[]
  stays: Stay[]
  budget: BudgetLine[]
  flights?: Flight[]
}

export const budgetCategories = [
  "Flights",
  "Stays",
  "Transport",
  "Food",
  "Activities",
  "Other",
] as const
