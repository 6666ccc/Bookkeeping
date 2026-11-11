import type { Sale } from '../db'
import { fmtSigned, fmtYuan, formatTime, profitTone } from '../money'
import { TrashIcon } from './icons'

interface Props {
  sales: Sale[]
  onDelete: (sale: Sale) => void
  highlightId?: number | null
}

export default function LedgerList({ sales, onDelete, highlightId }: Props) {
  return (
    <ul className="rows">
      {sales.map((sale) => {
        const profit = (sale.priceCents - sale.costCents) * sale.quantity
        return (
          <li
            className={`row${sale.id === highlightId ? ' is-new' : ''}`}
            key={sale.id}
          >
            <time dateTime={new Date(sale.createdAt).toISOString()}>
              {formatTime(sale.createdAt)}
            </time>
            <div className="row-main">
              <p className="row-name">{sale.productName}</p>
              <p className="row-detail">
                {sale.quantity} × ¥{fmtYuan(sale.priceCents)} · 进 ¥{fmtYuan(sale.costCents)}
              </p>
            </div>
            <span className={`row-profit ${profitTone(profit)}`}>{fmtSigned(profit)}</span>
            {sale.id === highlightId && <span className="stamp" aria-hidden="true">记</span>}
            <button
              type="button"
              className="row-del"
              onClick={() => onDelete(sale)}
              aria-label={`删除 ${sale.productName}`}
            >
              <TrashIcon />
            </button>
          </li>
        )
      })}
    </ul>
  )
}
