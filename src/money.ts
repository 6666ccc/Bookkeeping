const yuanFormat = new Intl.NumberFormat('zh-CN', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

export function parseCents(raw: string): number | null {
  const text = raw.trim().replace(/[,\s]/g, '')
  if (!/^\d+(\.\d{1,2})?$/.test(text)) return null
  const [whole, fraction = ''] = text.split('.')
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, '0'))
  return Number.isSafeInteger(cents) ? cents : null
}

export function parseQuantity(raw: string): number | null {
  const text = raw.trim()
  if (!/^\d+$/.test(text)) return null
  const value = Number(text)
  return Number.isSafeInteger(value) && value >= 1 && value <= 9999 ? value : null
}

export function fmtYuan(cents: number): string {
  return yuanFormat.format(cents / 100)
}

export function fmtSigned(cents: number): string {
  if (cents === 0) return '¥0.00'
  return `${cents < 0 ? '−' : '+'}¥${fmtYuan(Math.abs(cents))}`
}

export function dayKey(date = new Date()): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const WEEKDAYS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

export function formatDayLabel(key: string): string {
  const [year, month, day] = key.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  const yearPrefix = year === new Date().getFullYear() ? '' : `${year}年`
  return `${yearPrefix}${month}月${day}日 ${WEEKDAYS[date.getDay()]}`
}

export function formatTime(timestamp: number): string {
  const date = new Date(timestamp)
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

export function profitTone(cents: number): string {
  return cents > 0 ? 'gain' : cents < 0 ? 'loss' : ''
}
