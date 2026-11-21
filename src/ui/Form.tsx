import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { Check, ChevronDown } from 'lucide-react'

// ------------------------------------------------------------------ checkbox
export function Checkbox({ checked, onChange, label, size = 'md' }: { checked: boolean; onChange: (v: boolean) => void; label?: ReactNode; size?: 'sm' | 'md' }) {
  return (
    <label className={`check check-${size}`}>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="check-box" aria-hidden>
        <Check size={size === 'sm' ? 11 : 13} strokeWidth={3.2} />
      </span>
      {label && <span className="check-label">{label}</span>}
    </label>
  )
}

// ------------------------------------------------------------------ switch
export function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label?: ReactNode }) {
  return (
    <label className="switch">
      <input type="checkbox" role="switch" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="switch-track" aria-hidden>
        <span className="switch-thumb" />
      </span>
      {label && <span className="check-label">{label}</span>}
    </label>
  )
}

// ------------------------------------------------------------------ segmented control
export interface SegOption<T> {
  value: T
  label: ReactNode
}
export function Segmented<T extends string | number>({ value, onChange, options, size = 'md', ariaLabel }: { value: T; onChange: (v: T) => void; options: SegOption<T>[]; size?: 'sm' | 'md'; ariaLabel?: string }) {
  return (
    <div className={`seg seg-${size}`} role="radiogroup" aria-label={ariaLabel}>
      {options.map((o) => (
        <button key={String(o.value)} type="button" role="radio" aria-checked={o.value === value} className={o.value === value ? 'active' : ''} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  )
}

// ------------------------------------------------------------------ select (custom dropdown)
export interface SelectOption<T> {
  value: T
  label: ReactNode
  /** shorter content for the closed trigger */
  short?: ReactNode
  icon?: ReactNode
}
export function Select<T extends string | number>({
  value,
  onChange,
  options,
  ariaLabel,
  align = 'left',
  compact,
  className,
}: {
  value: T
  onChange: (v: T) => void
  options: SelectOption<T>[]
  ariaLabel: string
  align?: 'left' | 'right'
  compact?: boolean
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const [hi, setHi] = useState(0)
  const box = useRef<HTMLDivElement>(null)
  const id = useId()
  const cur = options.find((o) => o.value === value) ?? options[0]

  useEffect(() => {
    if (!open) return
    setHi(Math.max(0, options.findIndex((o) => o.value === value)))
    const close = (e: PointerEvent) => {
      if (!box.current?.contains(e.target as Node)) setOpen(false)
    }
    window.addEventListener('pointerdown', close)
    return () => window.removeEventListener('pointerdown', close)
  }, [open, options, value])

  const onKey = (e: React.KeyboardEvent) => {
    if (!open && (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault()
      setOpen(true)
      return
    }
    if (!open) return
    if (e.key === 'Escape') setOpen(false)
    else if (e.key === 'ArrowDown') setHi((h) => (h + 1) % options.length)
    else if (e.key === 'ArrowUp') setHi((h) => (h - 1 + options.length) % options.length)
    else if (e.key === 'Enter' || e.key === ' ') {
      onChange(options[hi].value)
      setOpen(false)
    } else return
    e.preventDefault()
  }

  return (
    <div className={`select ${compact ? 'select-compact' : ''} ${className ?? ''}`} ref={box}>
      <button type="button" className={`select-trigger ${open ? 'open' : ''}`} aria-haspopup="listbox" aria-expanded={open} aria-controls={id} aria-label={ariaLabel} onClick={() => setOpen((o) => !o)} onKeyDown={onKey}>
        {cur.icon}
        <span className="select-value">{cur.short ?? cur.label}</span>
        <ChevronDown size={15} strokeWidth={2.2} className="select-caret" aria-hidden />
      </button>
      {open && (
        <ul className={`select-menu ${align}`} role="listbox" id={id}>
          {options.map((o, i) => (
            <li
              key={String(o.value)}
              role="option"
              aria-selected={o.value === value}
              className={`${i === hi ? 'hi' : ''} ${o.value === value ? 'sel' : ''}`}
              onPointerEnter={() => setHi(i)}
              onClick={() => {
                onChange(o.value)
                setOpen(false)
              }}
            >
              {o.icon}
              <span>{o.label}</span>
              {o.value === value && <Check size={15} strokeWidth={2.4} className="select-check" aria-hidden />}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

// ------------------------------------------------------------------ slider
export function Slider({ value, onChange, min, max, step = 1, ariaLabel }: { value: number; onChange: (v: number) => void; min: number; max: number; step?: number; ariaLabel: string }) {
  const track = useRef<HTMLDivElement>(null)
  const pct = ((value - min) / (max - min)) * 100
  const setFrom = (clientX: number) => {
    const r = track.current!.getBoundingClientRect()
    const raw = min + ((clientX - r.left) / r.width) * (max - min)
    onChange(Math.min(max, Math.max(min, Math.round(raw / step) * step)))
  }
  return (
    <div
      className="slider"
      ref={track}
      role="slider"
      tabIndex={0}
      aria-label={ariaLabel}
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={value}
      onPointerDown={(e) => {
        ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
        setFrom(e.clientX)
      }}
      onPointerMove={(e) => {
        if (e.buttons & 1) setFrom(e.clientX)
      }}
      onKeyDown={(e) => {
        if (e.key === 'ArrowRight' || e.key === 'ArrowUp') onChange(Math.min(max, value + step))
        else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') onChange(Math.max(min, value - step))
        else return
        e.preventDefault()
      }}
    >
      <div className="slider-rail" />
      <div className="slider-fill" style={{ width: `${pct}%` }} />
      <div className="slider-thumb" style={{ left: `${pct}%` }} />
    </div>
  )
}

// ------------------------------------------------------------------ text input
export function TextInput({ icon, className, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { icon?: ReactNode }) {
  return (
    <div className={`input-wrap ${icon ? 'has-icon' : ''}`}>
      {icon && <span className="input-icon">{icon}</span>}
      <input {...props} className={`input ${className ?? ''}`} />
    </div>
  )
}
