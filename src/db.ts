import Dexie, { type Table } from 'dexie'

export interface Sale {
  id?: number
  productId?: string
  productName: string
  costCents: number
  priceCents: number
  quantity: number
  soldOn: string
  createdAt: number
}

export interface Product {
  id: string
  name: string
  costCents: number
  priceCents: number
  createdAt: number
}

export interface BackupData {
  sales: Omit<Sale, 'id'>[]
  // null denotes a legacy backup: leave the current product catalog untouched.
  products: Product[] | null
}

class BookkeepingDB extends Dexie {
  sales!: Table<Sale, number>
  products!: Table<Product, string>

  constructor() {
    super('xiaozhangben')
    this.version(1).stores({
      sales: '++id, soldOn, createdAt, [soldOn+createdAt]',
    })
    this.version(2).stores({
      sales: '++id, soldOn, createdAt, [soldOn+createdAt], productId',
      products: 'id, &name, createdAt',
    })
  }
}

export const db = new BookkeepingDB()

export function addSale(sale: Omit<Sale, 'id'>) {
  return db.sales.add(sale)
}

export function deleteSale(id: number) {
  return db.sales.delete(id)
}

export async function restoreBackup(backup: BackupData) {
  await db.transaction('rw', db.sales, db.products, async () => {
    await db.sales.clear()
    await db.sales.bulkAdd(backup.sales)
    if (backup.products !== null) {
      await db.products.clear()
      await db.products.bulkAdd(backup.products)
    }
  })
}

export class DuplicateProductError extends Error {
  constructor() {
    super('该商品已存在，请编辑已有商品。')
  }
}

export async function saveProduct(input: Omit<Product, 'id' | 'createdAt'>, id?: string) {
  const name = input.name.trim()
  if (!name || name.length > 60 || !isInt(input.costCents, 0) || !isInt(input.priceCents, 0)) {
    throw new Error('请填写有效的商品名称和价格。')
  }
  return db.transaction('rw', db.products, async () => {
    const duplicate = await db.products.where('name').equals(name).first()
    if (duplicate && duplicate.id !== id) throw new DuplicateProductError()
    const current = id ? await db.products.get(id) : undefined
    if (id && !current) throw new Error('商品已被删除，请重新录入。')
    const product: Product = {
      id: current?.id ?? Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) => b.toString(16).padStart(2, '0')).join(''),
      name,
      costCents: input.costCents,
      priceCents: input.priceCents,
      createdAt: current?.createdAt ?? Date.now(),
    }
    await db.products.put(product)
    return product
  })
}

export function deleteProduct(id: string) {
  return db.products.delete(id)
}

export async function recordSale(productId: string, costCents: number, priceCents: number, quantity: number, soldOn: string) {
  if (!isInt(costCents, 0) || !isInt(priceCents, 0) || !isInt(quantity, 1) || quantity > 9999 || !isDateKey(soldOn)) {
    throw new Error('请检查价格和数量。')
  }
  if (!Number.isSafeInteger(costCents * quantity) || !Number.isSafeInteger(priceCents * quantity)) {
    throw new Error('这笔金额过大，请调小价格或数量。')
  }
  return db.transaction('rw', db.products, db.sales, async () => {
    const product = await db.products.get(productId)
    if (!product) throw new Error('该商品已被删除，请重新选择。')
    return addSale({ productId, productName: product.name, costCents, priceCents, quantity, soldOn, createdAt: Date.now() })
  })
}

function isInt(value: unknown, min: number): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= min
}

function isDateKey(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  )
}

export function parseBackup(text: string): BackupData | null {
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    return null
  }

  if (typeof raw !== 'object' || raw === null) return null
  const envelope = raw as Record<string, unknown>
  const modern = !Array.isArray(raw) && envelope.version === 2
  if (!Array.isArray(raw) && envelope.version !== undefined && envelope.version !== 1 && !modern) return null
  if (!modern && 'products' in envelope) return null
  if (modern && envelope.app !== 'xiaozhangben') return null
  const list = Array.isArray(raw) ? raw : envelope.sales
  if (!Array.isArray(list)) return null

  const sales: Omit<Sale, 'id'>[] = []
  for (const item of list) {
    if (typeof item !== 'object' || item === null) return null
    const record = item as Record<string, unknown>
    if (typeof record.productName !== 'string' || record.productName.trim() === '') {
      return null
    }
    if (!isInt(record.costCents, 0) || !isInt(record.priceCents, 0)) return null
    if (!isInt(record.quantity, 1)) return null
    if (!isDateKey(record.soldOn)) return null
    if (!isInt(record.createdAt, 0)) return null
    if (!Number.isFinite(new Date(record.createdAt).getTime())) return null
    if (modern && record.productId !== undefined && (typeof record.productId !== 'string' || !record.productId)) return null

    sales.push({
      productName: record.productName.trim().slice(0, 60),
      costCents: record.costCents,
      priceCents: record.priceCents,
      quantity: record.quantity,
      soldOn: record.soldOn,
      createdAt: record.createdAt,
      ...(modern && typeof record.productId === 'string' ? { productId: record.productId } : {}),
    })
  }
  if (!modern) return { sales, products: null }
  if (!Array.isArray(envelope.products)) return null
  const products: Product[] = []
  const ids = new Set<string>()
  const names = new Set<string>()
  for (const item of envelope.products) {
    if (typeof item !== 'object' || item === null) return null
    const record = item as Record<string, unknown>
    if (typeof record.id !== 'string' || !record.id || ids.has(record.id)) return null
    if (typeof record.name !== 'string' || !record.name.trim() || record.name.trim().length > 60) return null
    const name = record.name.trim()
    if (names.has(name) || !isInt(record.costCents, 0) || !isInt(record.priceCents, 0) || !isInt(record.createdAt, 0)) return null
    if (!Number.isFinite(new Date(record.createdAt).getTime())) return null
    products.push({ id: record.id, name, costCents: record.costCents, priceCents: record.priceCents, createdAt: record.createdAt })
    ids.add(record.id)
    names.add(name)
  }
  return { sales, products }
}
