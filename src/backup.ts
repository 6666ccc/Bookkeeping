import { db, type Product, type Sale } from './db.ts'

function csvCell(value: string | number): string {
  const text = String(value)
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

export function salesToCsv(sales: Sale[]): string {
  const lines: (string | number)[][] = [
    ['日期', '时间', '商品', '进价(元)', '售价(元)', '数量', '利润(元)'],
  ]
  const ordered = [...sales].sort((a, b) => b.createdAt - a.createdAt)

  for (const sale of ordered) {
    const time = new Date(sale.createdAt)
    const hour = String(time.getHours()).padStart(2, '0')
    const minute = String(time.getMinutes()).padStart(2, '0')
    const profit = (sale.priceCents - sale.costCents) * sale.quantity
    lines.push([
      sale.soldOn,
      `${hour}:${minute}`,
      sale.productName,
      (sale.costCents / 100).toFixed(2),
      (sale.priceCents / 100).toFixed(2),
      String(sale.quantity),
      (profit / 100).toFixed(2),
    ])
  }

  return `﻿${lines.map((line) => line.map(csvCell).join(',')).join('\r\n')}`
}

export function salesToJson(sales: Sale[], products: Product[]): string {
  return JSON.stringify(
    {
      app: 'xiaozhangben',
      version: 2,
      exportedAt: new Date().toISOString(),
      sales,
      products,
    },
    null,
    2,
  )
}

export function exportBackupJson(): Promise<string> {
  return db.transaction('r', db.sales, db.products, async () => {
    const [sales, products] = await Promise.all([db.sales.toArray(), db.products.toArray()])
    return salesToJson(sales, products)
  })
}

export function downloadText(filename: string, text: string, mime: string) {
  const blob = new Blob([text], { type: `${mime};charset=utf-8` })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.append(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}
