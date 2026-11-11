import { useRef, useState } from 'react'
import type { ChangeEvent } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, parseBackup, restoreBackup, type BackupData, type Sale } from '../db'
import { downloadText, exportBackupJson, salesToCsv } from '../backup'
import { dayKey } from '../money'
import ConfirmDialog from './ConfirmDialog'
import { DownloadIcon, InstallIcon, TableIcon, UploadIcon } from './icons'

interface Props {
  sales: Sale[]
  canInstall: boolean
  installed: boolean
  onInstall: () => void
  isIos: boolean
  onRestored: () => void
}

export default function DataTools({
  sales,
  canInstall,
  installed,
  onInstall,
  isIos,
  onRestored,
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [pending, setPending] = useState<BackupData | null>(null)
  const [status, setStatus] = useState('')
  const [busy, setBusy] = useState(false)
  const busyRef = useRef(false)
  const productCount = useLiveQuery(() => db.products.count(), [], 0)

  async function exportJson() {
    if (busyRef.current) return
    busyRef.current = true; setBusy(true)
    try {
      downloadText(`小账本备份-${dayKey()}.json`, await exportBackupJson(), 'application/json')
      setStatus('已导出完整备份，包含商品库和销售记录。')
    } catch { setStatus('备份导出失败，请重试。') }
    finally { busyRef.current = false; setBusy(false) }
  }

  function exportCsv() {
    downloadText(`小账本账目-${dayKey()}.csv`, salesToCsv(sales), 'text/csv')
    setStatus(`已导出 ${sales.length} 条记录，可用 Excel 或 WPS 打开。`)
  }

  async function pickFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    let text: string
    try {
      text = await file.text()
    } catch {
      setStatus('读不了这个文件。')
      return
    }

    const parsed = parseBackup(text)
    if (!parsed) {
      setStatus('文件格式不对。请选择由「导出备份」生成的 JSON 文件。')
      return
    }
    setPending(parsed)
  }

  async function confirmImport() {
    if (!pending || busyRef.current) return
    busyRef.current = true; setBusy(true)
    try {
      await restoreBackup(pending)
      onRestored()
      setStatus(pending.products === null
        ? `已导入 ${pending.sales.length} 条销售记录，现有商品库已保留。`
        : `已导入 ${pending.products.length} 种商品和 ${pending.sales.length} 条销售记录。`)
      setPending(null)
    } catch { setStatus('导入失败，原数据已保留，请重试。'); setPending(null) }
    finally { busyRef.current = false; setBusy(false) }
  }

  return (
    <section className="tools" aria-labelledby="tools-heading">
      <h2 id="tools-heading">数据与备份</h2>
      <p>记录只存在这台手机里，清理浏览器数据会丢失。建议每周导出一份备份。</p>

      <div className="tool-buttons">
        <button type="button" className="tool" disabled={busy} onClick={exportJson}>
          <DownloadIcon />
          导出备份
        </button>
        <button type="button" className="tool" disabled={busy} onClick={exportCsv}>
          <TableIcon />
          导出表格
        </button>
        <button type="button" className="tool" disabled={busy} onClick={() => fileRef.current?.click()}>
          <UploadIcon />
          导入备份
        </button>
        {canInstall && !installed && (
          <button type="button" className="tool primary" onClick={onInstall}>
            <InstallIcon />
            添加到主屏
          </button>
        )}
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        onChange={pickFile}
        hidden
      />

      {isIos && !installed && (
        <p className="status">在 iPhone 上：用 Safari 打开，点分享按钮，再选「添加到主屏幕」。</p>
      )}
      {status && (
        <p className="status" role="status">
          {status}
        </p>
      )}

      <ConfirmDialog
        open={pending !== null}
        title="导入备份"
        body={
          pending
            ? pending.products === null
              ? `这是旧版备份，将用其中的 ${pending.sales.length} 条销售记录替换当前的 ${sales.length} 条销售记录。现有商品库保留。`
              : `将用备份里的 ${pending.products.length} 种商品和 ${pending.sales.length} 条销售记录，覆盖当前的 ${productCount} 种商品和 ${sales.length} 条销售记录。原有数据不会保留。`
            : ''
        }
        confirmLabel="覆盖并导入"
        onConfirm={confirmImport}
        busy={busy}
        onCancel={() => { if (!busy) setPending(null) }}
      />
    </section>
  )
}
