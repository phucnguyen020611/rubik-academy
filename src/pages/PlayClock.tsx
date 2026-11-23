import { useCallback, useEffect, useMemo, useState } from 'react'
import { Copy, FlipHorizontal2, MousePointerClick, Move3d, Play as PlayIcon, Redo2, RotateCcw, Shuffle, Undo2 } from 'lucide-react'
import { ClockStage } from '../puzzles/ClockModel'
import {
  applyClockMoves,
  applyTurn,
  clockLabel,
  clockScramble,
  formatClock,
  invertClockMove,
  isClockSolved,
  mirrorPin,
  parseClock,
  solvedClock,
  wheelTurn,
  type ClockMove,
  type ClockState,
  type Pin,
} from '../puzzles/clock'
import { useTheme } from '../theme'
import { useLang, L } from '../i18n'
import { Button, IconButton } from '../ui/Button'
import { TextInput } from '../ui/Form'
import { Toast } from '../ui/Overlay'
import { PuzzlePicker } from './PlayVariant'

const fmt = (ms: number) => {
  const s = ms / 1000
  const m = Math.floor(s / 60)
  return m ? `${m}:${(s % 60).toFixed(2).padStart(5, '0')}` : s.toFixed(2)
}

const ALL_DOWN: Record<Pin, boolean> = { UL: false, UR: false, DL: false, DR: false }

export default function PlayClock() {
  const { theme } = useTheme()
  const { t } = useLang()
  const [state, setState] = useState<ClockState>(solvedClock)
  const [frontUp, setFrontUp] = useState<Record<Pin, boolean>>({ UL: true, UR: true, DL: false, DR: false })
  const [flipped, setFlipped] = useState(false)
  const [history, setHistory] = useState<ClockMove[]>([])
  const [scrambled, setScrambled] = useState<string | null>(null)
  const [timer, setTimer] = useState<{ start: number; end?: number } | null>(null)
  const [now, setNow] = useState(0)
  const [toast, setToast] = useState<string | null>(null)
  const [alg, setAlg] = useState('')
  const view = flipped ? 'back' : 'front'

  useEffect(() => {
    if (!timer || timer.end) return
    let raf = 0
    const tick = () => {
      setNow(performance.now())
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [timer])

  /** apply user moves: update state, history, timer and the solved check */
  const play = (moves: ClockMove[]) => {
    let s = state
    let f = flipped
    let h = history
    for (const m of moves) {
      if (m.kind === 'flip') f = !f
      else s = applyTurn(s, m)
      const last = h[h.length - 1]
      // keep "UR1+ UR1+" as one "UR2+"
      if (m.kind === 'turn' && last?.kind === 'turn' && last.side === m.side && last.pins.join() === m.pins.join()) {
        const amount = last.amount + m.amount
        h = amount % 12 ? [...h.slice(0, -1), { ...last, amount }] : h.slice(0, -1)
      } else h = [...h, m]
    }
    setState(s)
    setFlipped(f)
    setHistory(h)
    const turned = moves.some((m) => m.kind === 'turn')
    if (scrambled && turned && !timer) setTimer({ start: performance.now() })
    if (scrambled && turned && isClockSolved(s)) {
      const end = performance.now()
      const start = timer?.start ?? end
      setTimer({ start, end })
      setToast(t(L(`Xong rồi! ${fmt(end - start)} giây`, `Solved in ${fmt(end - start)}s!`)))
      setScrambled(null)
    }
  }

  const onWheel = (pinFront: Pin, dir: 1 | -1) => {
    const pin = view === 'front' ? pinFront : mirrorPin(pinFront)
    play([wheelTurn(view, frontUp, pin, dir)])
  }
  /** pins on the panel are shown as seen from the side you're looking at */
  const upSeen = (p: Pin) => (view === 'front' ? frontUp[p] : !frontUp[mirrorPin(p)])
  const togglePin = (pFront: Pin) => setFrontUp((u) => ({ ...u, [pFront]: !u[pFront] }))
  const toggleSeen = (p: Pin) => togglePin(view === 'front' ? p : mirrorPin(p))

  const scramble = () => {
    const moves = clockScramble()
    setState(applyClockMoves(solvedClock(), moves))
    setFlipped(true)
    setFrontUp(ALL_DOWN)
    setScrambled(formatClock(moves))
    setHistory([])
    setTimer(null)
  }
  const reset = () => {
    setState(solvedClock())
    setFlipped(false)
    setHistory([])
    setScrambled(null)
    setTimer(null)
  }
  const undo = () => {
    const last = history[history.length - 1]
    if (!last) return
    if (last.kind === 'flip') setFlipped((f) => !f)
    else setState((s) => applyTurn(s, invertClockMove(last) as Extract<ClockMove, { kind: 'turn' }>))
    setHistory((h) => h.slice(0, -1))
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      if (e.key === 'Backspace') {
        e.preventDefault()
        undo()
      } else if (e.key.toLowerCase() === 'y' || e.key === ' ') {
        e.preventDefault()
        play([{ kind: 'flip' }])
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const parsed = useMemo(() => parseClock(alg, view), [alg, view])
  const elapsed = timer ? (timer.end ?? now) - timer.start : 0
  const clearToast = useCallback(() => setToast(null), [])

  return (
    <div className="play">
      <div className="play-stage stage">
        <ClockStage state={state} frontUp={frontUp} flipped={flipped} onPin={togglePin} onWheel={onWheel} dark={theme === 'dark'} />
        <div className="play-hud">
          <div className={`play-timer ${timer?.end ? 'done' : ''}`}>{timer ? fmt(elapsed) : scrambled ? t(L('Sẵn sàng', 'Ready')) : '0.00'}</div>
          <div className="muted small">{t(view === 'front' ? L('Mặt trước', 'Front') : L('Mặt sau', 'Back'))}</div>
        </div>
        <div className="play-hint">
          <span>
            <MousePointerClick size={13} /> {t(L('Bấm núm để vặn (Shift hoặc chuột phải = ngược), bấm chốt để bật/tắt', 'Click a wheel to turn (Shift or right-click = back), click a pin to flip it'))}
          </span>
          <span className="hide-mobile">
            <Move3d size={13} /> {t(L('Phím Y hoặc Space để lật mặt', 'Y or Space to flip over'))}
          </span>
        </div>
      </div>

      <aside className="play-panel">
        <div className="card card-pad">
          <div className="panel-row">
            <h3 style={{ margin: 0 }}>{t(L('Chơi tự do', 'Free play'))}</h3>
            <PuzzlePicker value="clock" />
          </div>
          <p className="text-2 small" style={{ margin: '0 0 var(--sp-4)' }}>
            {t(L('Không có lớp nào để xoay: mục tiêu là đưa cả 18 kim về 12 giờ. Chốt nào đang bật quyết định những mặt số nào quay theo núm.', 'Nothing to turn here: the goal is to point all 18 hands at 12. The pins decide which dials a wheel moves.'))}
          </p>
          <div className="action-grid">
            <Button variant="primary" icon={Shuffle} onClick={scramble}>
              {t(L('Xáo trộn', 'Scramble'))}
            </Button>
            <Button variant="secondary" icon={RotateCcw} onClick={reset}>
              {t(L('Đặt lại', 'Reset'))}
            </Button>
            <Button variant="secondary" icon={Undo2} onClick={undo} disabled={!history.length}>
              {t(L('Hoàn tác', 'Undo'))}
            </Button>
            <Button variant="secondary" icon={FlipHorizontal2} onClick={() => play([{ kind: 'flip' }])}>
              {t(L('Lật mặt', 'Flip'))}
            </Button>
          </div>
          {scrambled && <p className="scramble-text">{scrambled}</p>}
        </div>

        <div className="card card-pad">
          <div className="panel-row" style={{ marginBottom: '0.75rem' }}>
            <h4 className="section-title" style={{ margin: 0 }}>
              {t(L('Chốt và núm', 'Pins and wheels'))}
            </h4>
            <span className="muted small truncate">{t(L('nhìn từ mặt đang hiện', 'as seen from this side'))}</span>
          </div>
          <div className="clock-pad">
            {(['UL', 'UR', 'DL', 'DR'] as Pin[]).map((p) => (
              <div key={p} className="clock-pad-cell">
                <button type="button" className="move-btn" onClick={() => play([wheelTurn(view, frontUp, p, -1)])} aria-label={`${p} −1`}>
                  <Undo2 size={15} />
                </button>
                <button type="button" className={`pin-btn ${upSeen(p) ? 'up' : ''}`} onClick={() => toggleSeen(p)} aria-pressed={upSeen(p)}>
                  {p}
                </button>
                <button type="button" className="move-btn" onClick={() => play([wheelTurn(view, frontUp, p, 1)])} aria-label={`${p} +1`}>
                  <Redo2 size={15} />
                </button>
              </div>
            ))}
          </div>
          <p className="muted small" style={{ margin: 'var(--sp-3) 0 0' }}>
            {t(L('Chốt sáng = đang bật về phía bạn. Các mũi tên vặn núm ở góc đó.', 'A lit pin is pushed towards you. The arrows turn the wheel in that corner.'))}
          </p>
        </div>

        <div className="card card-pad">
          <h4 className="section-title">{t(L('Chạy một chuỗi nước', 'Run a sequence'))}</h4>
          <form
            className="row nowrap"
            onSubmit={(e) => {
              e.preventDefault()
              if (parsed?.length) play(parsed)
            }}
          >
            <TextInput className="mono" value={alg} onChange={(e) => setAlg(e.target.value)} placeholder="UR3+ ALL2- y2" aria-label={t(L('Chuỗi nước', 'Moves'))} />
            <Button type="submit" variant="primary" icon={PlayIcon} disabled={!parsed?.length}>
              {t(L('Chạy', 'Run'))}
            </Button>
          </form>
        </div>

        {history.length > 0 && (
          <div className="card card-pad">
            <div className="panel-row">
              <h4 className="section-title" style={{ margin: 0 }}>
                {t(L(`Lịch sử (${history.length})`, `History (${history.length})`))}
              </h4>
              <IconButton icon={Copy} size="sm" label={t(L('Sao chép', 'Copy'))} onClick={() => navigator.clipboard?.writeText(history.map(clockLabel).join(' '))} />
            </div>
            <p className="scramble-text" style={{ maxHeight: '7.5rem', overflow: 'auto' }}>
              {history.map(clockLabel).join(' ')}
            </p>
          </div>
        )}
      </aside>
      {toast && <Toast onDone={clearToast}>{toast}</Toast>}
    </div>
  )
}

