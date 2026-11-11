import type { Sale } from './db'

export interface Totals {
  revenue: number
  cost: number
  profit: number
  quantity: number
  count: number
}

export function totalsOf(sales: Sale[]): Totals {
  let revenue = 0
  let cost = 0
  let quantity = 0
  for (const sale of sales) {
    revenue += sale.priceCents * sale.quantity
    cost += sale.costCents * sale.quantity
    quantity += sale.quantity
  }
  return { revenue, cost, profit: revenue - cost, quantity, count: sales.length }
}

export interface DayGroup {
  day: string
  sales: Sale[]
  totals: Totals
}

export function groupByDay(sales: Sale[]): DayGroup[] {
  const groups = new Map<string, Sale[]>()
  for (const sale of sales) {
    const list = groups.get(sale.soldOn)
    if (list) {
      list.push(sale)
    } else {
      groups.set(sale.soldOn, [sale])
    }
  }

  return [...groups.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([day, list]) => {
      list.sort((a, b) => b.createdAt - a.createdAt)
      return { day, sales: list, totals: totalsOf(list) }
    })
}
