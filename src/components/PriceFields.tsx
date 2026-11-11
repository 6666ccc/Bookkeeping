interface Props {
  prefix: string
  cost: string
  price: string
  onCost: (value: string) => void
  onPrice: (value: string) => void
  disabled?: boolean
}

export default function PriceFields({ prefix, cost, price, onCost, onPrice, disabled }: Props) {
  return <div className="entry-fields">
    {[{ key: 'cost', label: '进价', value: cost, change: onCost }, { key: 'price', label: '售价', value: price, change: onPrice }].map((field) => (
      <div className="field" key={field.key}>
        <label htmlFor={`${prefix}-${field.key}`}>{field.label}（元 / 件）</label>
        <div className="money-input"><span aria-hidden="true">¥</span>
          <input id={`${prefix}-${field.key}`} value={field.value} onChange={(e) => field.change(e.target.value)}
            inputMode="decimal" placeholder="0.00" autoComplete="off" disabled={disabled} />
        </div>
      </div>
    ))}
  </div>
}
