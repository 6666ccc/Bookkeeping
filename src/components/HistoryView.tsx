import { useMemo } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, type Sale } from '../db'
import { fmtSigned, fmtYuan, formatDayLabel, profitTone } from '../money'
import { groupByDay, totalsOf } from '../stats'
import { useCountUp } from '../useCountUp'
import DataTools from './DataTools'
import LedgerList from './LedgerList'

interface Props {
  today: string
  onDelete: (sale: Sale) => void
  canInstall: boolean
  installed: boolean
  onInstall: () => void
  isIos: boolean
  onRestored: () => void
}

export default function HistoryView({
  today,
  onDelete,
  canInstall,
  installed,
  onInstall,
  isIos,
  onRestored,
}: Props) {
  const sales = useLiveQuery(() => db.sales.toArray(), [], [])
  const groups = useMemo(() => groupByDay(sales), [sales])
  const month = today.slice(0, 7)
  const monthTotals = useMemo(
    () => totalsOf(sales.filter((sale) => sale.soldOn.startsWith(month))),
    [sales, month],
  )
  const allTotals = useMemo(() => totalsOf(sales), [sales])
  const monthProfit = useCountUp(monthTotals.profit)

  return (
    <>
      <section className="month" aria-label="本月汇总">
        <p className="month-label">本月利润</p>
        <p className={`month-profit ${profitTone(monthTotals.profit)}`}>
          {monthProfit < 0 && <span className="sign">−</span>}
          <span className="cny">¥</span>
          <span>{fmtYuan(Math.abs(monthProfit))}</span>
        </p>
        <p className="month-sub">
          {monthTotals.count} 笔 · 营业额 ¥{fmtYuan(monthTotals.revenue)} · 累计利润{' '}
          {fmtSigned(allTotals.profit)}
        </p>
      </section>

      {groups.length === 0 ? (
        <p className="empty">
          还没有任何记录。回到「售出」记下第一笔，这里会自动按天汇总。
        </p>
      ) : (
        groups.map((group) => (
          <section className="day" key={group.day}>
            <header className="day-head">
              <div>
                <h2>{formatDayLabel(group.day)}</h2>
                <p>
                  {group.totals.count} 笔 · 营业额 ¥{fmtYuan(group.totals.revenue)}
                </p>
              </div>
              <span className={`day-profit ${profitTone(group.totals.profit)}`}>
                {fmtSigned(group.totals.profit)}
              </span>
            </header>
            <LedgerList sales={group.sales} onDelete={onDelete} />
          </section>
        ))
      )}

      <DataTools
        sales={sales}
        canInstall={canInstall}
        installed={installed}
        onInstall={onInstall}
        isIos={isIos}
        onRestored={onRestored}
      />
    </>
  )
}
