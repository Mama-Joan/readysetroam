import type { BudgetLine, Trip } from "@/lib/types"

export type GroupBalance = {
  group: string
  currency: string
  owesYou: number
  youOwe: number
}

function samePerson(left: string, right: string) {
  return left.trim().toLowerCase() === right.trim().toLowerCase()
}

export function isLedgerPerson(name: string, payer = "You") {
  if (samePerson(name, payer)) return true
  const lowered = name.trim().toLowerCase()
  return payer.trim().toLowerCase() === "you" && (lowered === "you" || lowered === "ash")
}

export function lineShare(line: BudgetLine) {
  if (line.shares && line.shares.length > 0) {
    return line.shares
      .filter((share) => share.name.trim())
      .map((share) => ({ group: share.name.trim(), share: share.amount }))
  }
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
      if (!(share > 0) || isLedgerPerson(group, payer)) continue
      if (payer === "You" || samePerson(payer, "Ash")) take(group, line.currency).owesYou += share
      else if (isLedgerPerson(group, "You")) take(payer, line.currency).youOwe += share
    }
  }

  return [...totals.values()]
    .filter((balance) => balance.owesYou > 0.004 || balance.youOwe > 0.004)
    .sort((a, b) => b.owesYou - a.owesYou || a.group.localeCompare(b.group))
}
