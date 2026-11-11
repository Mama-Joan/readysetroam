import type { BudgetLine, Trip } from "@/lib/types"

export type GroupBalance = {
  group: string
  currency: string
  owesYou: number
  youOwe: number
}

export function lineShare(line: BudgetLine) {
  const groups = (line.splitGroups ?? []).map((group) => group.trim()).filter(Boolean)
  if (groups.length === 0 || !(line.amount > 0)) return []
  const share = line.amount / groups.length
  return groups.map((group) => ({ group, share }))
}

export function groupBalances(trip: Trip): GroupBalance[] {
  const totals = new Map<string, GroupBalance>()
  const take = (group: string, currency: string) => {
    const key = `${currency}::${group}`
    const existing = totals.get(key)
    if (existing) return existing
    const created = { group, currency, owesYou: 0, youOwe: 0 }
    totals.set(key, created)
    return created
  }

  for (const line of trip.budget) {
    const payer = (line.paidBy || "You").trim() || "You"
    for (const { group, share } of lineShare(line)) {
      if (group === payer) continue
      if (payer === "You" && group !== "You") take(group, line.currency).owesYou += share
      else if (group === "You" && payer !== "You") take(payer, line.currency).youOwe += share
    }
  }

  return [...totals.values()]
    .filter((balance) => balance.owesYou > 0.004 || balance.youOwe > 0.004)
    .sort((a, b) => b.owesYou - a.owesYou || a.group.localeCompare(b.group))
}
