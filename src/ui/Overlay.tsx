import { useEffect, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { IconButton, Button } from './Button'
import { useLang } from '../i18n'

function useOverlay(open: boolean, onClose: () => void) {
  const ref = useRef<HTMLDivElement>(null)
  const closeRef = useRef(onClose)
  closeRef.current = onClose
  useEffect(() => {
    if (!open) return
    const prev = document.activeElement as HTMLElement | null
    const k = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeRef.current()
    }
    window.addEventListener('keydown', k)
    const sw = window.innerWidth - document.documentElement.clientWidth
    document.body.style.overflow = 'hidden'
    document.body.style.paddingRight = `${sw}px`
    setTimeout(() => ref.current?.focus(), 0)
    return () => {
      window.removeEventListener('keydown', k)
      document.body.style.overflow = ''
      document.body.style.paddingRight = ''
      prev?.focus?.()
    }
  }, [open])
  return ref
}

/** Centered dialog. */
export function Modal({ open, onClose, title, eyebrow, children, footer, width = 460 }: { open: boolean; onClose: () => void; title?: ReactNode; eyebrow?: ReactNode; children?: ReactNode; footer?: ReactNode; width?: number }) {
  const { t } = useLang()
  const ref = useOverlay(open, onClose)
  if (!open) return null
  return createPortal(
    <div className="ov-backdrop" onPointerDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" tabIndex={-1} ref={ref} style={{ maxWidth: width }}>
        <div className="modal-head">
          <div style={{ minWidth: 0 }}>
            {eyebrow && <div className="eyebrow">{eyebrow}</div>}
            {title && <h3 className="modal-title">{title}</h3>}
          </div>
          <IconButton icon={X} label={t({ vi: 'Đóng', en: 'Close' })} size="sm" onClick={onClose} />
        </div>
        {children && <div className="modal-body">{children}</div>}
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>,
    document.body,
  )
}

/** Side sheet (right on desktop, bottom sheet on phones). */
export function Drawer({ open, onClose, title, eyebrow, actions, children }: { open: boolean; onClose: () => void; title?: ReactNode; eyebrow?: ReactNode; actions?: ReactNode; children?: ReactNode }) {
  const { t } = useLang()
  const ref = useOverlay(open, onClose)
  if (!open) return null
  return createPortal(
    <div className="ov-backdrop ov-side" onPointerDown={(e) => e.target === e.currentTarget && onClose()}>
      <aside className="drawer" role="dialog" aria-modal="true" tabIndex={-1} ref={ref}>
        <div className="drawer-head">
          <div style={{ minWidth: 0 }}>
            {eyebrow && <div className="eyebrow">{eyebrow}</div>}
            {title && <h2 className="drawer-title">{title}</h2>}
          </div>
          <div className="row nowrap" style={{ gap: 4 }}>
            {actions}
            <IconButton icon={X} label={t({ vi: 'Đóng', en: 'Close' })} size="sm" onClick={onClose} />
          </div>
        </div>
        <div className="drawer-body">{children}</div>
      </aside>
    </div>,
    document.body,
  )
}

export function ConfirmDialog({ open, onClose, onConfirm, title, message, confirmLabel, danger }: { open: boolean; onClose: () => void; onConfirm: () => void; title: ReactNode; message?: ReactNode; confirmLabel: ReactNode; danger?: boolean }) {
  const { t } = useLang()
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      width={400}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t({ vi: 'Huỷ', en: 'Cancel' })}
          </Button>
          <Button
            variant="primary"
            className={danger ? 'btn-danger' : ''}
            onClick={() => {
              onConfirm()
              onClose()
            }}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      {message && <p className="text-2" style={{ margin: 0 }}>{message}</p>}
    </Modal>
  )
}

export function Toast({ children, onDone, ms = 3000 }: { children: ReactNode; onDone: () => void; ms?: number }) {
  useEffect(() => {
    const t = setTimeout(onDone, ms)
    return () => clearTimeout(t)
  }, [onDone, ms])
  return createPortal(
    <div className="toast" role="status">
      {children}
    </div>,
    document.body,
  )
}
