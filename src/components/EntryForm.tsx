import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, recordSale, type Product } from '../db'
import { dayKey, fmtSigned, fmtYuan, parseCents, parseQuantity, profitTone } from '../money'
import ProductPicker from './ProductPicker'
import PriceFields from './PriceFields'
import { ChevronIcon, ProductIcon } from './icons'

interface Props {
  onSaved: (id: number) => void
  onManageProducts: () => void
}

export default function EntryForm({ onSaved, onManageProducts }: Props) {
  const catalog = useLiveQuery(async () => {
    const [products, sales] = await Promise.all([db.products.toArray(), db.sales.toArray()])
    const lastUsed = new Map<string, number>()
    for (const sale of sales) {
      if (sale.productId) lastUsed.set(sale.productId, Math.max(lastUsed.get(sale.productId) ?? 0, sale.createdAt))
    }
    products.sort((a, b) => (lastUsed.get(b.id) ?? 0) - (lastUsed.get(a.id) ?? 0) || a.name.localeCompare(b.name, 'zh-CN'))
    return { products, lastUsed }
  })
  const [productId, setProductId] = useState<string | null>(null)
  const [cost, setCost] = useState('')
  const [price, setPrice] = useState('')
  const [quantity, setQuantity] = useState('1')
  const [adjusting, setAdjusting] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState('')
  const [saving, setSaving] = useState(false)
  const savingRef = useRef(false)
  const chooseRef = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    if (saved && !saving) chooseRef.current?.focus()
  }, [saved, saving])
  const selected = catalog?.products.find((p) => p.id === productId)
  const costCents = parseCents(cost)
  const priceCents = parseCents(price)
  const quantityValue = parseQuantity(quantity)
  const preview = selected && costCents !== null && priceCents !== null && quantityValue !== null
    ? (priceCents - costCents) * quantityValue : null

  function selectProduct(product: Product) {
    setProductId(product.id)
    setCost((product.costCents / 100).toFixed(2))
    setPrice((product.priceCents / 100).toFixed(2))
    setAdjusting(false)
    setPickerOpen(false)
    setError('')
    setSaved('')
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (savingRef.current) return
    setSaved('')
    if (!selected) {
      setError('请先选择售出的商品。')
      chooseRef.current?.focus()
      return
    }
    if (costCents === null || priceCents === null) {
      setError('进价和售价要填非负数字，最多两位小数。')
      return
    }
    if (quantityValue === null) {
      setError('数量要填 1 到 9999 之间的整数。')
      return
    }
    savingRef.current = true
    setSaving(true)
    try {
      const id = await recordSale(selected.id, costCents, priceCents, quantityValue, dayKey())
      setProductId(null)
      setCost('')
      setPrice('')
      setQuantity('1')
      setAdjusting(false)
      setError('')
      setSaved(`已记下「${selected.name}」${quantityValue} 件。`)
      onSaved(id)
      chooseRef.current?.focus()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '保存失败，请重试。')
    } finally {
      savingRef.current = false
      setSaving(false)
    }
  }

  if (!catalog) return <p className="empty" role="status">正在读取商品…</p>
  if (catalog.products.length === 0) return (
    <section className="catalog-empty">
      <div className="empty-product-icon"><ProductIcon /></div>
      <h2>先录入商品，售出时直接选</h2>
      <p>商品名称、进价和售价只需录入一次。</p>
      <button className="save" type="button" onClick={onManageProducts}>去录入商品</button>
    </section>
  )

  return (
    <>
      <form className="entry" onSubmit={handleSubmit} noValidate aria-label="记录售出">
        <div className="section-heading"><h2>记一笔售出</h2><span>选商品 · 填数量</span></div>
        <div className="field full">
          <label id="sale-product-label">售出商品</label>
          <button ref={chooseRef} className={`product-select${selected ? ' has-selection' : ''}`} type="button"
            aria-labelledby="sale-product-label sale-product-value" aria-haspopup="dialog" disabled={saving}
            onClick={() => setPickerOpen(true)}>
            <span id="sale-product-value">{selected?.name ?? '选择商品'}</span><ChevronIcon />
          </button>
        </div>
        {selected && (
          <div className="sale-prices">
            <p>进价 ¥{fmtYuan(costCents ?? selected.costCents)} <span>／</span> 售价 ¥{fmtYuan(priceCents ?? selected.priceCents)}</p>
            <button className="text-button" type="button" aria-expanded={adjusting} aria-controls="sale-price-fields"
              disabled={saving} onClick={() => setAdjusting(!adjusting)}>{adjusting ? '收起价格' : '调整本次价格'}</button>
          </div>
        )}
        {selected && adjusting && <div id="sale-price-fields" className="price-adjustment">
          <PriceFields prefix="sale" cost={cost} price={price} onCost={setCost} onPrice={setPrice} disabled={saving} />
          <p className="field-hint">只影响这笔销售，商品默认价格保持不变。</p>
        </div>}
        <div className="entry-bottom">
          <div className="field qty-field">
            <label htmlFor="quantity">售出数量</label>
            <div className="stepper">
              <button type="button" disabled={saving} onClick={() => setQuantity(String(Math.max(1, (parseQuantity(quantity) ?? 1) - 1)))} aria-label="减少数量">−</button>
              <input id="quantity" value={quantity} onChange={(e) => setQuantity(e.target.value)} inputMode="numeric" enterKeyHint="done" disabled={saving} />
              <button type="button" disabled={saving} onClick={() => setQuantity(String(Math.min(9999, (parseQuantity(quantity) ?? 1) + 1)))} aria-label="增加数量">+</button>
            </div>
          </div>
          <div className="preview" aria-live="polite"><span className="preview-label">这笔利润</span>
            <span key={preview ?? 'empty'} className={`preview-value ${preview === null ? '' : profitTone(preview)}`}>{preview === null ? '—' : fmtSigned(preview)}</span>
          </div>
        </div>
        {error && <p className="form-error" role="alert">{error}</p>}
        {saved && <p className="save-feedback" role="status">{saved}</p>}
        <button className="save" type="submit" disabled={saving}>{saving ? '正在记下…' : '记下这笔售出'}</button>
      </form>
      <ProductPicker open={pickerOpen} products={catalog.products} lastUsed={catalog.lastUsed}
        onSelect={selectProduct} onCancel={() => setPickerOpen(false)} onManage={() => { setPickerOpen(false); onManageProducts() }} />
    </>
  )
}
