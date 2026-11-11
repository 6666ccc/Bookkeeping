import { useDeferredValue, useRef, useState, type FormEvent } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, deleteProduct, DuplicateProductError, saveProduct, type Product } from '../db'
import { fmtYuan, parseCents } from '../money'
import ConfirmDialog from './ConfirmDialog'
import PriceFields from './PriceFields'

export default function ProductsView() {
  const products = useLiveQuery(() => db.products.orderBy('createdAt').reverse().toArray())
  const [editing, setEditing] = useState<Product | null>(null)
  const [name, setName] = useState('')
  const [cost, setCost] = useState('')
  const [price, setPrice] = useState('')
  const [query, setQuery] = useState('')
  const [error, setError] = useState('')
  const [status, setStatus] = useState('')
  const [duplicate, setDuplicate] = useState<Product | null>(null)
  const [pendingDelete, setPendingDelete] = useState<Product | null>(null)
  const [busy, setBusy] = useState(false)
  const busyRef = useRef(false)
  const nameRef = useRef<HTMLInputElement>(null)
  const formRef = useRef<HTMLFormElement>(null)
  const search = useDeferredValue(query.trim().toLocaleLowerCase())
  const filtered = products?.filter((p) => p.name.toLocaleLowerCase().includes(search)) ?? []

  function reset() {
    setEditing(null); setName(''); setCost(''); setPrice(''); setError(''); setDuplicate(null)
  }

  function edit(product: Product) {
    setEditing(product); setName(product.name)
    setCost((product.costCents / 100).toFixed(2)); setPrice((product.priceCents / 100).toFixed(2))
    setError(''); setStatus(''); setDuplicate(null)
    formRef.current?.scrollIntoView({ block: 'start', behavior: 'smooth' })
    nameRef.current?.focus({ preventScroll: true })
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (busyRef.current) return
    setStatus(''); setDuplicate(null)
    const costCents = parseCents(cost)
    const priceCents = parseCents(price)
    if (!name.trim()) { setError('请填写商品名称。'); nameRef.current?.focus(); return }
    if (costCents === null || priceCents === null) { setError('进价和售价要填非负数字，最多两位小数。'); return }
    busyRef.current = true; setBusy(true)
    try {
      const saved = await saveProduct({ name, costCents, priceCents }, editing?.id)
      setStatus(`已${editing ? '更新' : '录入'}「${saved.name}」。`)
      reset(); nameRef.current?.focus()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '保存失败，请重试。')
      if (cause instanceof DuplicateProductError) setDuplicate(await db.products.where('name').equals(name.trim()).first() ?? null)
    } finally { busyRef.current = false; setBusy(false) }
  }

  async function confirmDelete() {
    if (!pendingDelete || busyRef.current) return
    busyRef.current = true; setBusy(true)
    try {
      await deleteProduct(pendingDelete.id)
      if (editing?.id === pendingDelete.id) reset()
      setStatus(`已删除「${pendingDelete.name}」，历史销售保留。`)
      setPendingDelete(null)
    } catch { setError('删除失败，请重试。'); setPendingDelete(null) }
    finally { busyRef.current = false; setBusy(false) }
  }

  return <>
    <form ref={formRef} className="entry product-form" onSubmit={submit} noValidate aria-label={editing ? '编辑商品' : '录入商品'}>
      <div className="section-heading"><h2>{editing ? '编辑商品' : '录入商品'}</h2>{editing && <button className="text-button" type="button" disabled={busy} onClick={() => { reset(); setStatus('') }}>取消编辑</button>}</div>
      <div className="field full"><label htmlFor="catalog-name">商品名称（含规格）</label>
        <input ref={nameRef} id="catalog-name" className="text-input" value={name} onChange={(e) => setName(e.target.value)} maxLength={60}
          placeholder="比如 可口可乐 330ml" autoComplete="off" disabled={busy} /></div>
      <PriceFields prefix="catalog" cost={cost} price={price} onCost={setCost} onPrice={setPrice} disabled={busy} />
      {error && <p className="form-error" role="alert">{error}</p>}
      {duplicate && <button type="button" className="text-button duplicate-action" onClick={() => edit(duplicate)}>编辑已有商品「{duplicate.name}」</button>}
      {status && <p className="save-feedback" role="status">{status}</p>}
      <button type="submit" className="save" disabled={busy}>{busy ? '正在处理…' : editing ? '保存修改' : '保存商品'}</button>
    </form>
    <section className="products-section" aria-labelledby="products-heading">
      <div className="ledger-head"><h2 id="products-heading">商品库</h2><span>{products?.length ?? 0} 种商品</span></div>
      {products && products.length > 0 && <div className="product-search"><label className="sr-only" htmlFor="catalog-search">搜索商品库</label>
        <input id="catalog-search" type="search" className="text-input" placeholder="搜索商品名称" value={query} onChange={(e) => setQuery(e.target.value)} /></div>}
      {!products ? <p className="empty">正在读取商品…</p> : products.length === 0 ? <p className="empty">还没有商品。在上方录入名称和价格，就可以去「售出」记账了。</p>
        : filtered.length === 0 ? <p className="empty">没有找到这个商品，换个名称试试。</p>
        : <ul className="product-list">{filtered.map((product) => <li className="product-row" key={product.id}>
          <div className="product-info"><h3>{product.name}</h3><p>进价 ¥{fmtYuan(product.costCents)} <span>／</span> 售价 ¥{fmtYuan(product.priceCents)}</p></div>
          <div className="product-actions"><button className="text-button" type="button" aria-label={`编辑 ${product.name}`} disabled={busy} onClick={() => edit(product)}>编辑</button>
            <button className="text-button danger-text" type="button" aria-label={`删除商品 ${product.name}`} disabled={busy} onClick={() => setPendingDelete(product)}>删除</button></div>
        </li>)}</ul>}
    </section>
    <ConfirmDialog open={pendingDelete !== null} title="删除商品" body={`确定删除「${pendingDelete?.name ?? ''}」？历史销售不会受影响，以后需要时可以重新录入。`}
      confirmLabel="删除商品" busy={busy} onConfirm={confirmDelete} onCancel={() => { if (!busy) setPendingDelete(null) }} />
  </>
}
