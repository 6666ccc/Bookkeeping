import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, type Sale } from '../db'
import { fmtYuan, profitTone } from '../money'
import { totalsOf } from '../stats'
import { useCountUp } from '../useCountUp'
import EntryForm from './EntryForm'
import LedgerList from './LedgerList'

interface Props {
  today: string
  onDelete: (sale: Sale) => void
  onManageProducts: () => void
}

export default function TodayView({ today, onDelete, onManageProducts }: Props) {
  const sales = useLiveQuery(
    () => db.sales.where('soldOn').equals(today).toArray(),
    [today],
    [],
  )
  const ordered = useMemo(() => [...sales].sort((a, b) => b.createdAt - a.createdAt), [sales])
  const totals = useMemo(() => totalsOf(ordered), [ordered])
  const [highlightId, setHighlightId] = useState<number | null>(null)
  const profit = useCountUp(totals.profit)
  const revenue = useCountUp(totals.revenue)
  const cost = useCountUp(totals.cost)

  return (
    <>
      <section className="summary" aria-label="今日汇总">
        <p className="summary-label">今日利润</p>
        <p className={`profit ${profitTone(totals.profit)}`}>
          {profit < 0 && <span className="sign">−</span>}
          <span className="cny">¥</span>
          <span className="figure">{fmtYuan(Math.abs(profit))}</span>
        </p>
        <dl className="stats">
          <div>
            <dt>营业额</dt>
            <dd>¥{fmtYuan(revenue)}</dd>
          </div>
          <div>
            <dt>成本</dt>
            <dd>¥{fmtYuan(cost)}</dd>
          </div>
          <div>
            <dt>卖出</dt>
            <dd>{totals.quantity} 件</dd>
          </div>
        </dl>
      </section>

      <EntryForm onSaved={setHighlightId} onManageProducts={onManageProducts} />

      <section className="ledger-section" aria-labelledby="today-heading">
        <div className="ledger-head">
          <h2 id="today-heading">今天</h2>
          <span>
            {totals.count} 笔 · {totals.quantity} 件
          </span>
        </div>
        {ordered.length === 0 ? (
          <p className="empty">今天还没有记录。选择商品记一笔售出，利润会立刻算出来。</p>
        ) : (
          <LedgerList sales={ordered} onDelete={onDelete} highlightId={highlightId} />
        )}
      </section>
    </>
  )
}
