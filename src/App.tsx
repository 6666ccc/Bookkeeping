import { useEffect, useRef, useState } from 'react'
import { addSale, deleteSale, type Sale } from './db'
import { dayKey, formatDayLabel } from './money'
import HistoryView from './components/HistoryView'
import TodayView from './components/TodayView'
import ProductsView from './components/ProductsView'
import { HistoryIcon, TodayIcon, ProductIcon } from './components/icons'

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

function detectStandalone() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  )
}

export default function App() {
  const [tab, setTab] = useState<'today' | 'products' | 'history'>('today')
  const [error, setError] = useState('')
  const [today, setToday] = useState(() => dayKey())
  const [undo, setUndo] = useState<Sale | null>(null)
  const [installEvent, setInstallEvent] = useState<InstallPromptEvent | null>(null)
  const [installed, setInstalled] = useState(detectStandalone)

  const undoTimer = useRef<number | undefined>(undefined)
  const undoingRef = useRef(false)
  const deletingRef = useRef(new Set<number>())
  const scrollRef = useRef<HTMLDivElement>(null)
  const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent)

  useEffect(() => {
    const checkDay = () => {
      setToday((current) => {
        const next = dayKey()
        return next === current ? current : next
      })
    }
    const interval = window.setInterval(checkDay, 30_000)
    document.addEventListener('visibilitychange', checkDay)
    return () => {
      window.clearInterval(interval)
      document.removeEventListener('visibilitychange', checkDay)
    }
  }, [])

  useEffect(() => {
    const handlePrompt = (event: Event) => {
      event.preventDefault()
      setInstallEvent(event as InstallPromptEvent)
    }
    const handleInstalled = () => {
      setInstalled(true)
      setInstallEvent(null)
    }
    window.addEventListener('beforeinstallprompt', handlePrompt)
    window.addEventListener('appinstalled', handleInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', handlePrompt)
      window.removeEventListener('appinstalled', handleInstalled)
    }
  }, [])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 })
  }, [tab])

  useEffect(() => {
    return () => {
      if (undoTimer.current) window.clearTimeout(undoTimer.current)
    }
  }, [])

  async function handleDelete(sale: Sale) {
    if (sale.id === undefined || deletingRef.current.has(sale.id)) return
    deletingRef.current.add(sale.id)
    try {
      await deleteSale(sale.id)
      setUndo(sale)
      setError('')
      if (undoTimer.current) window.clearTimeout(undoTimer.current)
      undoTimer.current = window.setTimeout(() => setUndo(null), 6000)
    } catch { setError('删除失败，请重试。') }
    finally { deletingRef.current.delete(sale.id) }
  }

  async function handleUndo() {
    if (!undo || undoingRef.current) return
    undoingRef.current = true
    try {
      await addSale({
        productId: undo.productId,
        productName: undo.productName,
        costCents: undo.costCents,
        priceCents: undo.priceCents,
        quantity: undo.quantity,
        soldOn: undo.soldOn,
        createdAt: undo.createdAt,
      })
      setUndo(null)
      setError('')
      if (undoTimer.current) window.clearTimeout(undoTimer.current)
    } catch { setError('撤销失败，请重试。') }
    finally { undoingRef.current = false }
  }

  async function handleInstall() {
    if (!installEvent) return
    await installEvent.prompt()
    const choice = await installEvent.userChoice
    if (choice.outcome === 'accepted') setInstalled(true)
    setInstallEvent(null)
  }

  return (
    <div className="app">
      <div className="scroll" ref={scrollRef}>
        <header className="top">
          <div className="seal" aria-hidden="true">
            账
          </div>
          <div className="brand">
            <h1>小账本</h1>
            <p>{formatDayLabel(today)}</p>
          </div>
        </header>

        <main className="page" key={tab}>
          {error && <p className="app-error" role="alert">{error}<button type="button" className="text-button" onClick={() => setError('')}>关闭</button></p>}
          {tab === 'today' ? (
            <TodayView today={today} onDelete={handleDelete} onManageProducts={() => setTab('products')} />
          ) : tab === 'products' ? (
            <ProductsView />
          ) : (
            <HistoryView
              today={today}
              onDelete={handleDelete}
              canInstall={installEvent !== null}
              installed={installed}
              onInstall={handleInstall}
              isIos={isIos}
              onRestored={() => { setUndo(null); setError(''); if (undoTimer.current) window.clearTimeout(undoTimer.current) }}
            />
          )}
        </main>
      </div>

      <nav className="tabbar" aria-label="页面">
        <button
          type="button"
          aria-current={tab === 'today' ? 'page' : undefined}
          className="tab"
          onClick={() => setTab('today')}
        >
          <TodayIcon />
          <span>售出</span>
        </button>
        <button type="button" aria-current={tab === 'products' ? 'page' : undefined} className="tab" onClick={() => setTab('products')}>
          <ProductIcon /><span>商品</span>
        </button>
        <button
          type="button"
          aria-current={tab === 'history' ? 'page' : undefined}
          className="tab"
          onClick={() => setTab('history')}
        >
          <HistoryIcon />
          <span>记录</span>
        </button>
      </nav>

      {undo && (
        <div className="toast" role="status">
          <span className="toast-text">已删除「{undo.productName}」</span>
          <button type="button" onClick={handleUndo}>
            撤销
          </button>
        </div>
      )}
    </div>
  )
}
