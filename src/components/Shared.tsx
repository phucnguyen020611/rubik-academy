import { useEffect, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Box, Check, ChevronDown, ChevronRight, ChevronUp, Copy, Target } from 'lucide-react'
import { AlgPlayer } from '../cube/AlgPlayer'
import type { MaskName } from '../data/beginner'
import type { SchemeName } from '../cube/schemes'
import { algLength } from '../cube/engine'
import { useStored } from '../theme'
import { useLang, L } from '../i18n'
import { Button, IconButton } from '../ui/Button'
import { Checkbox } from '../ui/Form'
import { Drawer } from '../ui/Overlay'

export function PageHead({ crumbs, eyebrow, title, children }: { crumbs?: { to: string; label: string }[]; eyebrow?: ReactNode; title: ReactNode; children?: ReactNode }) {
  return (
    <div className="page-head fade-up">
      {crumbs && (
        <nav className="crumbs" aria-label="breadcrumb">
          {crumbs.map((c, i) => (
            <span key={c.to} className="row nowrap" style={{ gap: '0.5rem' }}>
              <Link to={c.to}>{c.label}</Link>
              {i < crumbs.length - 1 && <ChevronRight size={13} />}
            </span>
          ))}
        </nav>
      )}
      {eyebrow && <span className="eyebrow">{eyebrow}</span>}
      <h1 style={{ marginTop: '0.5rem' }}>{title}</h1>
      {children}
    </div>
  )
}

/** Learned-case tracking shared by libraries and the trainer. */
export function useLearned() {
  const [learned, setLearned] = useStored<Record<string, boolean>>('ra-learned', {})
  const toggle = (id: string) => setLearned((l) => ({ ...l, [id]: !l[id] }))
  return { learned, toggle, setLearned }
}

export function CopyButton({ text, size = 'sm' }: { text: string; size?: 'sm' | 'md' }) {
  const { t } = useLang()
  const [ok, setOk] = useState(false)
  useEffect(() => {
    if (!ok) return
    const id = setTimeout(() => setOk(false), 1400)
    return () => clearTimeout(id)
  }, [ok])
  return (
    <Button size={size} variant="secondary" icon={ok ? Check : Copy} onClick={() => navigator.clipboard?.writeText(text).then(() => setOk(true), () => {})}>
      {ok ? t(L('Đã chép', 'Copied')) : t(L('Sao chép', 'Copy'))}
    </Button>
  )
}

export interface DrawerCase {
  id: string
  title: string
  subtitle?: string
  alg: string
  pre?: string
  setup?: string
  alts?: string[]
  mask?: MaskName
  scheme?: SchemeName
  desc?: ReactNode
  trainerSet?: string
}

export function CaseDrawer({ c, onClose, onPrev, onNext }: { c: DrawerCase | null; onClose: () => void; onPrev?: () => void; onNext?: () => void }) {
  const { t } = useLang()
  const { learned, toggle } = useLearned()
  const [alg, setAlg] = useState(c?.alg ?? '')
  const cid = c?.id
  const calg = c?.alg
  useEffect(() => {
    if (calg) setAlg(calg)
  }, [cid, calg])
  useEffect(() => {
    if (!cid) return
    const k = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown' && onNext) onNext()
      else if (e.key === 'ArrowUp' && onPrev) onPrev()
      else return
      e.preventDefault()
    }
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [cid, onNext, onPrev])
  const all = c ? [c.alg, ...(c.alts ?? [])] : []
  return (
    <Drawer
      open={!!c}
      onClose={onClose}
      eyebrow={c?.subtitle}
      title={c?.title}
      actions={
        <>
          {onPrev && <IconButton icon={ChevronUp} size="sm" label={t(L('Trường hợp trước', 'Previous case'))} onClick={onPrev} />}
          {onNext && <IconButton icon={ChevronDown} size="sm" label={t(L('Trường hợp sau', 'Next case'))} onClick={onNext} />}
        </>
      }
    >
      {c && (
        <>
          {c.desc && <div className="text-2" style={{ marginBottom: '1rem' }}>{c.desc}</div>}
          <AlgPlayer key={c.id + alg} alg={alg} pre={c.pre} setup={c.setup} mask={c.mask} scheme={c.scheme} autoPlay />
          <div className="divider" />
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <h4 className="section-title" style={{ margin: 0 }}>
              {all.length > 1 ? t(L(`Công thức (${all.length})`, `Algorithms (${all.length})`)) : t(L('Công thức', 'Algorithm'))}
            </h4>
            <Checkbox checked={!!learned[c.id]} onChange={() => toggle(c.id)} label={t(L('Đã thuộc', 'Learned'))} />
          </div>
          <div className="grid" style={{ marginTop: '0.75rem', gap: '0.5rem' }}>
            {all.map((a) => (
              <button key={a} type="button" className={`alg-option ${a === alg ? 'active' : ''}`} onClick={() => setAlg(a)}>
                <span className="alg">{a}</span>
                <span className="muted small" style={{ whiteSpace: 'nowrap' }}>
                  {t(L(`${algLength(a)} nước`, `${algLength(a)} moves`))}
                </span>
              </button>
            ))}
          </div>
          <div className="row" style={{ marginTop: '1rem' }}>
            <CopyButton text={alg} />
            <Button size="sm" variant="secondary" icon={Box} to="/play?n=3">
              {t(L('Thử trên khối', 'Try it'))}
            </Button>
            {c.trainerSet && (
              <Button size="sm" variant="primary" icon={Target} to={`/trainer?set=${c.trainerSet}`}>
                {t(L('Luyện', 'Drill'))}
              </Button>
            )}
          </div>
          <p className="muted small" style={{ marginTop: '1rem', marginBottom: 0 }}>
            {t(L('Phím tắt: ← → tua từng nước, Space để phát hoặc dừng, ↑ ↓ đổi trường hợp.', 'Shortcuts: ← → step, Space play or pause, ↑ ↓ change case.'))}
          </p>
        </>
      )}
    </Drawer>
  )
}
