import { useDeferredValue, useEffect, useRef, useState, type CSSProperties } from 'react'
import type { Product } from '../db'
import { fmtYuan } from '../money'

interface Props {
  open: boolean
  products: Product[]
  lastUsed: Map<string, number>
  onSelect: (product: Product) => void
  onCancel: () => void
  onManage: () => void
}

export default function ProductPicker({ open, products, lastUsed, onSelect, onCancel, onManage }: Props) {
  const ref = useRef<HTMLDialogElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const [query, setQuery] = useState('')
  const search = useDeferredValue(query.trim().toLocaleLowerCase())
  const filtered = products.filter((p) => p.name.toLocaleLowerCase().includes(search))

  useEffect(() => {
    if (open && !ref.current?.open) {
      setQuery('')
      ref.current?.showModal()
      searchRef.current?.focus()
    } else if (!open) ref.current?.close()
  }, [open])

  return <dialog ref={ref} className="dialog product-picker" aria-labelledby="picker-title"
    onCancel={(event) => { event.preventDefault(); onCancel() }}>
    <div className="picker-heading"><h2 id="picker-title">选择售出商品</h2>
      <button type="button" className="text-button" onClick={onCancel}>取消</button></div>
    <label className="sr-only" htmlFor="picker-search">搜索商品名称</label>
    <input ref={searchRef} id="picker-search" className="text-input search-input" type="search"
      placeholder="搜索商品名称" value={query} onChange={(e) => setQuery(e.target.value)} autoComplete="off" />
    <p className="picker-hint" role="status">{search ? `找到 ${filtered.length} 种商品` : '最近售出的商品优先显示'}</p>
    <ul className="picker-options">
      {filtered.map((product, index) => <li key={product.id} style={{ '--i': Math.min(index, 8) } as CSSProperties}><button type="button" className="picker-option" onClick={() => onSelect(product)}>
        <span className="picker-name">{product.name}{lastUsed.has(product.id) && <small>最近售出</small>}</span>
        <span className="picker-price">售价 ¥{fmtYuan(product.priceCents)}<small>进价 ¥{fmtYuan(product.costCents)}</small></span>
      </button></li>)}
      {filtered.length === 0 && <li className="empty">没有找到商品，换个名称试试，或先录入商品。</li>}
    </ul>
    <button type="button" className="picker-manage text-button" onClick={onManage}>去商品页录入 / 编辑</button>
  </dialog>
}
