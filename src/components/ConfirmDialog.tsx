import { useEffect, useId, useRef } from 'react'

interface Props {
  open: boolean
  title: string
  body: string
  confirmLabel: string
  onConfirm: () => void
  onCancel: () => void
  busy?: boolean
}

export default function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel,
  onConfirm,
  onCancel,
  busy = false,
}: Props) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  const bodyId = useId()

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    const handleCancel = (event: Event) => {
      event.preventDefault()
      if (!busy) onCancel()
    }
    dialog.addEventListener('cancel', handleCancel)
    return () => dialog.removeEventListener('cancel', handleCancel)
  }, [onCancel, busy])

  return (
    <dialog ref={ref} className="dialog" aria-labelledby={titleId} aria-describedby={bodyId} aria-busy={busy}>
      <h2 id={titleId}>{title}</h2>
      <p id={bodyId}>{body}</p>
      <div className="dialog-actions">
        <button type="button" disabled={busy} onClick={onCancel} autoFocus>
          取消
        </button>
        <button type="button" className="danger" disabled={busy} onClick={onConfirm}>
          {busy ? '正在处理…' : confirmLabel}
        </button>
      </div>
    </dialog>
  )
}
