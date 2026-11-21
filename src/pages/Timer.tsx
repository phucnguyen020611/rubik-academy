import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Copy, Download, RefreshCw, Trash2, X } from 'lucide-react'
import { PageHead } from '../components/Shared'
import { NetDiagram } from '../cube/Diagrams'
import { randomScramble, stateFromAlg } from '../cube/engine'
import { useStored } from '../theme'
import { useLang, L } from '../i18n'
import { Button, IconButton, Kbd } from '../ui/Button'
import { Segmented, Switch } from '../ui/Form'
import { ConfirmDialog } from '../ui/Overlay'

interface Solve {
  t: number
  penalty: 0 | 2 | 'dnf'
  scramble: string
  at: number
  n: number
}

type Phase = 'idle' | 'holding' | 'ready' | 'inspect' | 'running'

const fmt = (ms: number) => {
  if (!isFinite(ms)) return 'DNF'
  const s = ms / 1000
  const m = Math.floor(s / 60)
  return m ? `${m}:${(s % 60).toFixed(2).padStart(5, '0')}` : s.toFixed(2)
}
const value = (s: Solve) => (s.penalty === 'dnf' ? Infinity : s.t + (s.penalty === 2 ? 2000 : 0))

/** Average of N the competition way: drop best and worst, mean of the rest. */
function aoN(list: Solve[], n: number) {
  if (list.length < n) return null
  const v = list.slice(0, n).map(value).sort((a, b) => a - b)
  const mid = v.slice(1, -1)
  if (mid.some((x) => !isFinite(x))) return Infinity
  return mid.reduce((a, b) => a + b, 0) / mid.length
}

export default function Timer() {
  const { t } = useLang()
  const [size, setSize] = useStored('ra-timer-n', 3)
  const [inspection, setInspection] = useStored('ra-timer-insp', false)
  const [solves, setSolves] = useStored<Solve[]>('ra-times', [])
  const [scramble, setScramble] = useState(() => randomScramble(size))
  const [phase, setPhase] = useState<Phase>('idle')
  const [elapsed, setElapsed] = useState(0)
  const [inspLeft, setInspLeft] = useState(15)
  const [confirmClear, setConfirmClear] = useState(false)
  const start = useRef(0)
  const holdTimer = useRef(0)
  const inspStart = useRef(0)
  const inspPenalty = useRef<0 | 2 | 'dnf'>(0)
  const phaseRef = useRef(phase)
  phaseRef.current = phase

  useEffect(() => {
    setScramble(randomScramble(size))
  }, [size])

  useEffect(() => {
    if (phase !== 'running' && phase !== 'inspect') return
    let raf = 0
    const tick = () => {
      if (phaseRef.current === 'running') setElapsed(performance.now() - start.current)
      else setInspLeft(15 - (performance.now() - inspStart.current) / 1000)
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [phase])

  const stop = useCallback(() => {
    const ms = performance.now() - start.current
    setElapsed(ms)
    setPhase('idle')
    setSolves((s) => [{ t: ms, penalty: inspPenalty.current, scramble, at: Date.now(), n: size }, ...s].slice(0, 500))
    setScramble(randomScramble(size))
  }, [scramble, size, setSolves])

  const press = useCallback(() => {
    const p = phaseRef.current
    if (p === 'running') return stop()
    if (p === 'idle' && inspection) {
      inspStart.current = performance.now()
      inspPenalty.current = 0
      setPhase('inspect')
      return
    }
    if (p === 'idle' || p === 'inspect') {
      setPhase('holding')
      holdTimer.current = window.setTimeout(() => setPhase('ready'), 300)
    }
  }, [inspection, stop])

  const release = useCallback(() => {
    const p = phaseRef.current
    clearTimeout(holdTimer.current)
    if (p === 'ready') {
      if (inspection && inspStart.current) {
        const over = (performance.now() - inspStart.current) / 1000 - 15
        inspPenalty.current = over > 2 ? 'dnf' : over > 0 ? 2 : 0
      } else inspPenalty.current = 0
      inspStart.current = 0
      start.current = performance.now()
      setElapsed(0)
      setPhase('running')
    } else if (p === 'holding') setPhase(inspStart.current ? 'inspect' : 'idle')
  }, [inspection])

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === 'INPUT' || confirmClear) return
      if (phaseRef.current === 'running') {
        e.preventDefault()
        stop()
        return
      }
      if (e.code !== 'Space' || e.repeat) return
      e.preventDefault()
      press()
    }
    const up = (e: KeyboardEvent) => {
      if (e.code !== 'Space') return
      e.preventDefault()
      release()
    }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
    }
  }, [press, release, stop, confirmClear])

  const session = useMemo(() => solves.filter((s) => s.n === size), [solves, size])
  const best = session.length ? Math.min(...session.map(value)) : null
  const finite = session.map(value).filter(isFinite)
  const mean = finite.length ? finite.reduce((a, b) => a + b, 0) / finite.length : null
  const scState = useMemo(() => stateFromAlg(size, scramble), [size, scramble])

  const setPenalty = (at: number, penalty: Solve['penalty']) => setSolves((s) => s.map((x) => (x.at === at ? { ...x, penalty: x.penalty === penalty ? 0 : penalty } : x)))
  const exportCsv = () => {
    const rows = ['#,time,penalty,scramble,date', ...session.map((s, i) => `${session.length - i},${(s.t / 1000).toFixed(2)},${s.penalty},"${s.scramble}",${new Date(s.at).toISOString()}`)]
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([rows.join('\n')], { type: 'text/csv' }))
    a.download = `rubik-academy-${size}x${size}.csv`
    a.click()
  }

  const inspecting = phase === 'inspect' || ((phase === 'holding' || phase === 'ready') && inspStart.current > 0)
  const display = inspecting ? (inspLeft > 0 ? Math.ceil(inspLeft).toString() : inspLeft > -2 ? '+2' : 'DNF') : fmt(elapsed)

  return (
    <div className="page">
      <div className="container">
        <PageHead eyebrow={t(L('Công cụ', 'Tools'))} title={t(L('Bấm giờ', 'Timer'))}>
          <p>
            {t(L('Giữ ', 'Hold '))}
            <Kbd>Space</Kbd>
            {t(L(' (hoặc chạm và giữ vùng số) đến khi số chuyển xanh, thả ra để bắt đầu. Nhấn phím bất kỳ để dừng.', ' (or press and hold the numbers) until they turn green, then let go to start. Press any key to stop.'))}
          </p>
        </PageHead>
        <div className="timer-layout">
          <div className="card timer-main">
            <div className="panel-row" style={{ flexWrap: 'wrap' }}>
              <Segmented size="sm" value={size} onChange={setSize} ariaLabel={t(L('Cỡ khối', 'Cube size'))} options={[2, 3, 4, 5].map((s) => ({ value: s, label: `${s}×${s}` }))} />
              <Switch checked={inspection} onChange={setInspection} label={t(L('15 giây quan sát', '15s inspection'))} />
            </div>
            <div className="scramble mono">{scramble}</div>
            <div className="row" style={{ justifyContent: 'center', gap: '0.5rem' }}>
              <Button variant="ghost" size="sm" icon={RefreshCw} onClick={() => setScramble(randomScramble(size))}>
                {t(L('Scramble khác', 'New scramble'))}
              </Button>
              <Button variant="ghost" size="sm" icon={Copy} onClick={() => navigator.clipboard?.writeText(scramble)}>
                {t(L('Sao chép', 'Copy'))}
              </Button>
            </div>
            <div
              className={`timer-face ${phase}`}
              onPointerDown={(e) => {
                e.preventDefault()
                press()
              }}
              onPointerUp={release}
              role="button"
              tabIndex={0}
              aria-label={t(L('Vùng bấm giờ', 'Timer pad'))}
            >
              {display}
            </div>
            <NetDiagram className="timer-net" state={scState} />
          </div>
          <aside className="grid" style={{ alignContent: 'start', gap: '0.75rem' }}>
            <div className="card card-pad">
              <div className="stat-grid">
                {[
                  [t(L('Tốt nhất', 'Best')), best],
                  ['Ao5', aoN(session, 5)],
                  ['Ao12', aoN(session, 12)],
                  [t(L('Trung bình', 'Mean')), mean],
                ].map(([label, v]) => (
                  <div key={label as string}>
                    <span>{label as string}</span>
                    <strong>{v !== null ? fmt(v as number) : '–'}</strong>
                  </div>
                ))}
              </div>
            </div>
            <div className="card card-pad">
              <div className="panel-row">
                <h4 className="section-title" style={{ margin: 0 }}>
                  {t(L(`Lượt giải (${session.length})`, `Solves (${session.length})`))}
                </h4>
                <div className="row nowrap" style={{ gap: 2 }}>
                  <IconButton icon={Download} size="sm" label={t(L('Xuất CSV', 'Export CSV'))} onClick={exportCsv} disabled={!session.length} />
                  <IconButton icon={Trash2} size="sm" label={t(L('Xoá hết', 'Clear all'))} onClick={() => setConfirmClear(true)} disabled={!session.length} />
                </div>
              </div>
              <div className="solve-list">
                {session.slice(0, 60).map((s, i) => (
                  <div key={s.at} className="solve-row">
                    <span className="muted mono small" style={{ width: '2rem' }}>
                      {session.length - i}
                    </span>
                    <strong className="mono">
                      {s.penalty === 'dnf' ? 'DNF' : fmt(value(s))}
                      {s.penalty === 2 ? '+' : ''}
                    </strong>
                    <span className="spacer" />
                    <button type="button" className={`pen ${s.penalty === 2 ? 'on' : ''}`} onClick={() => setPenalty(s.at, 2)}>
                      +2
                    </button>
                    <button type="button" className={`pen ${s.penalty === 'dnf' ? 'on' : ''}`} onClick={() => setPenalty(s.at, 'dnf')}>
                      DNF
                    </button>
                    <IconButton icon={X} size="sm" label={t(L('Xoá', 'Delete'))} onClick={() => setSolves((x) => x.filter((y) => y.at !== s.at))} />
                  </div>
                ))}
                {!session.length && <p className="muted small" style={{ margin: '0.5rem 0 0' }}>{t(L('Chưa có lượt nào. Giải thử một lần xem!', 'No solves yet. Give it a go!'))}</p>}
              </div>
            </div>
          </aside>
        </div>
      </div>
      <ConfirmDialog
        open={confirmClear}
        onClose={() => setConfirmClear(false)}
        onConfirm={() => setSolves((s) => s.filter((x) => x.n !== size))}
        title={t(L('Xoá toàn bộ lượt giải?', 'Clear every solve?'))}
        message={t(L(`Tất cả lượt giải ${size}×${size} sẽ bị xoá và không khôi phục được.`, `All ${size}×${size} solves will be deleted for good.`))}
        confirmLabel={t(L('Xoá hết', 'Clear all'))}
        danger
      />
    </div>
  )
}
