import 'fake-indexeddb/auto'
import Dexie from 'dexie'
import { after, before, test } from 'node:test'
import assert from 'node:assert/strict'
import { db, saveProduct, deleteProduct, recordSale, parseBackup, restoreBackup, DuplicateProductError } from '../src/db.ts'
import { exportBackupJson, salesToJson } from '../src/backup.ts'

const legacySale = {
  productName: '旧账商品', costCents: 200, priceCents: 300,
  quantity: 2, soldOn: '2026-11-04', createdAt: 1793764800000,
}
const input = (name = '可口可乐 330ml') => ({ name, costCents: 200, priceCents: 300 })
const envelope = (sales = [], products = []) => ({ app: 'xiaozhangben', version: 2, sales, products })
const parse = (value) => parseBackup(JSON.stringify(value))
async function reset() {
  await db.transaction('rw', db.sales, db.products, async () => {
    await db.sales.clear()
    await db.products.clear()
  })
}

before(async () => {
  await Dexie.delete('xiaozhangben')
  const legacy = new Dexie('xiaozhangben')
  legacy.version(1).stores({ sales: '++id, soldOn, createdAt, [soldOn+createdAt]' })
  await legacy.table('sales').add(legacySale)
  legacy.close()
  await db.open()
})
after(async () => { await db.delete() })

test('v1 数据库升级保留旧账，商品库保持为空', async () => {
  const [sale] = await db.sales.toArray()
  assert.deepEqual({ ...sale, id: undefined }, { ...legacySale, id: undefined })
  assert.equal(await db.products.count(), 0)
  assert.ok(db.sales.schema.indexes.some((index) => index.name === 'productId'))
})

test('商品去除首尾空格，同名提示编辑；允许编辑自身，阻止改为其他已有名称', async () => {
  await reset()
  const product = await saveProduct(input(' 可口可乐 330ml '))
  assert.equal(product.name, '可口可乐 330ml')
  await assert.rejects(saveProduct(input('可口可乐 330ml')), DuplicateProductError)
  await saveProduct({ ...input(), priceCents: 350 }, product.id)
  assert.equal((await db.products.get(product.id)).priceCents, 350)
  const second = await saveProduct(input('可口可乐 500ml'))
  await assert.rejects(saveProduct(input(), second.id), DuplicateProductError)
  assert.equal(await db.products.count(), 2)
})

test('并发录入相同名称只保存一件商品', async () => {
  await reset()
  const results = await Promise.allSettled([saveProduct(input()), saveProduct(input())])
  assert.equal(results.filter((result) => result.status === 'fulfilled').length, 1)
  assert.equal(await db.products.count(), 1)
})

test('临时价格只影响本次；商品改名、改价、删除、同名重建均不改历史销售', async () => {
  await reset()
  const product = await saveProduct(input())
  const id = await recordSale(product.id, 210, 280, 3, '2026-11-05')
  const snapshot = await db.sales.get(id)
  assert.equal(snapshot.productName, product.name)
  assert.equal(snapshot.costCents, 210)
  assert.equal(snapshot.priceCents, 280)
  assert.equal((await db.products.get(product.id)).priceCents, 300)
  await saveProduct({ name: '可乐 新名称', costCents: 240, priceCents: 400 }, product.id)
  assert.deepEqual(await db.sales.get(id), snapshot)
  await deleteProduct(product.id)
  const replacement = await saveProduct(input())
  assert.notEqual(replacement.id, product.id)
  assert.deepEqual(await db.sales.get(id), snapshot)
})

test('拒绝已删除商品、无效数量、无效价格和超过安全范围的单笔金额', async () => {
  await reset()
  const product = await saveProduct(input())
  for (const quantity of [0, -1, 1.5, 10000]) {
    await assert.rejects(recordSale(product.id, 200, 300, quantity, '2026-11-05'))
  }
  await assert.rejects(recordSale(product.id, -1, 300, 1, '2026-11-05'))
  await assert.rejects(recordSale(product.id, Number.MAX_SAFE_INTEGER, 300, 2, '2026-11-05'))
  await deleteProduct(product.id)
  await assert.rejects(recordSale(product.id, 200, 300, 1, '2026-11-05'), /已被删除/)
  assert.equal(await db.sales.count(), 0)
})

test('新版备份完整往返，保留商品标识和已删除商品的销售快照', async () => {
  await reset()
  const product = await saveProduct(input())
  const removed = await saveProduct(input('纸巾'))
  await recordSale(product.id, 200, 250, 2, '2026-11-05')
  await recordSale(removed.id, 200, 300, 1, '2026-11-05')
  await deleteProduct(removed.id)
  const json = await exportBackupJson()
  const backup = parseBackup(json)
  assert.ok(backup)
  assert.equal(backup.products.length, 1)
  assert.equal(backup.sales.length, 2)
  await reset()
  await restoreBackup(backup)
  assert.deepEqual(await db.products.toArray(), [product])
  const roundTrip = parseBackup(await exportBackupJson())
  assert.deepEqual(roundTrip, backup)
})

test('旧版对象和数组备份兼容，导入只替换销售，不推导或覆盖商品', async () => {
  await reset()
  const product = await saveProduct(input())
  const legacy = parse({ app: 'xiaozhangben', version: 1, sales: [legacySale] })
  assert.ok(legacy)
  assert.equal(legacy.products, null)
  await restoreBackup(legacy)
  assert.deepEqual(await db.products.toArray(), [product])
  assert.equal((await db.sales.toArray())[0].productName, '旧账商品')
  assert.deepEqual(parse([legacySale]), legacy)
  assert.equal(parse([{ ...legacySale, productId: 'untrusted-legacy-link' }]).sales[0].productId, undefined)
})

test('只有商品、没有销售的新版备份也可恢复；空备份可准确覆盖', async () => {
  await reset()
  const product = await saveProduct(input())
  const backup = parseBackup(salesToJson([], [product]))
  assert.ok(backup)
  await restoreBackup(backup)
  assert.equal(await db.products.count(), 1)
  assert.equal(await db.sales.count(), 0)
  await restoreBackup(parse(envelope()))
  assert.equal(await db.products.count(), 0)
})

test('拒绝损坏、重复商品、缺失商品表或未知版本的备份', () => {
  const product = { id: 'p1', ...input(), createdAt: 1 }
  const invalid = [
    null, 123, {}, { ...envelope(), version: 99 }, { version: 2, app: 'xiaozhangben', sales: [] },
    { ...envelope(), app: 'other' }, { sales: [], products: [] }, envelope([], [product, product]),
    envelope([], [product, { ...product, id: 'p2', name: ` ${product.name} ` }]),
    envelope([], [{ ...product, priceCents: -1 }]),
    envelope([{ ...legacySale, soldOn: '2026-02-30' }]),
    envelope([{ ...legacySale, quantity: 0 }]),
    envelope([{ ...legacySale, createdAt: Number.MAX_SAFE_INTEGER }]),
  ]
  assert.equal(parseBackup('not json'), null)
  for (const value of invalid) assert.equal(parse(value), null)
})

test('恢复中发生写入失败时，两张表一起回滚，不丢失原有数据', async () => {
  await reset()
  const product = await saveProduct(input())
  const id = await recordSale(product.id, 200, 300, 1, '2026-11-05')
  const sale = await db.sales.get(id)
  await assert.rejects(restoreBackup({ sales: [], products: [product, { ...product, id: 'another-id' }] }))
  assert.deepEqual(await db.products.toArray(), [product])
  assert.deepEqual(await db.sales.toArray(), [sale])
})
