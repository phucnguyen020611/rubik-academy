import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Copy, Hand, Keyboard, Move3d, Play as PlayIcon, RotateCcw, Shuffle, Undo2 } from 'lucide-react'
import { PUZZLES, PUZZLE_IDS, type PuzzleEntry } from '../puzzles/registry'
import { TwistyStage } from '../puzzles/TwistyCanvas'
import type { TwistyView } from '../puzzles/TwistyView'
import { formatMoves, invertMoves, moveLabel, parseTwisty, randomScramble } from '../puzzles/twisty'
import { useStored, useTheme } from '../theme'
import { useLang, L } from '../i18n'
import { Button, IconButton } from '../ui/Button'
import { Select, Slider, TextInput } from '../ui/Form'
import { Toast } from '../ui/Overlay'

const fmt = (ms: number) => {
  const s = ms / 1000
  const m = Math.floor(s / 60)
  return m ? `${m}:${(s % 60).toFixed(2).padStart(5, '0')}` : s.toFixed(2)
}

/** Dropdown that switches between the cube and the other puzzles. */
export function PuzzlePicker({ value }: { value: string }) {
  const { t } = useLang()
  const [, setParams] = useSearchParams()
  return (
    <Select
      className="puzzle-picker"
      align="right"
      value={value}
      ariaLabel={t(L('Loại khối', 'Puzzle'))}
      onChange={(v) => setParams(v === 'cube' ? { n: '3' } : { p: v })}
      options={[
        { value: 'cube', label: t(L('Khối vuông 2×2 – 5×5', 'Cube 2×2 – 5×5')), short: t(L('Khối vuông', 'Cube')) },
        ...PUZZLE_IDS.map((id) => ({ value: id, label: t(PUZZLES[id].name) })),
        { value: 'clock', label: t(L('Clock', 'Clock')) },
      ]}
    />
  )
}

type Mode = 'idle' | 'scrambling' | 'undo'

export default function PlayVariant({ entry }: { entry: PuzzleEntry }) {
  const { theme } = useTheme()
  const { t } = useLang()
  const def = entry.def
  const [speed, setSpeed] = useStored('ra-play-speed', 180)
  const view = useRef<TwistyView | null>(null)
  const mode = useRef<Mode>('idle')
  const [history, setHistory] = useState<string[]>([])
  const [scrambled, setScrambled] = useState<string | null>(null)
  const [timer, setTimer] = useState<{ start: number; end?: number } | null>(null)
  const [now, setNow] = useState(0)
  const [toast, setToast] = useState<string | null>(null)
  const [alg, setAlg] = useState('')
  const [appear, setAppear] = useState(0)

  useEffect(() => {
    setHistory([])
    setScrambled(null)
    setTimer(null)
    setAppear((a) => a + 1)
  }, [entry])

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

  const scrambledRef = useRef(scrambled)
  scrambledRef.current = scrambled
  const timerRef = useRef(timer)
  timerRef.current = timer
  const tRef = useRef(t)
  tRef.current = t

  const clearToast = useCallback(() => setToast(null), [])
  const onReady = useCallback((v: TwistyView) => {
    view.current = v
  }, [])
  const onMove = useCallback((label: string, solved: boolean) => {
    const md = mode.current
    if (md === 'scrambling') return
    if (md === 'undo') setHistory((h) => h.slice(0, -1))
    else setHistory((h) => [...h, label])
    if (md === 'idle' && scrambledRef.current && !timerRef.current) setTimer({ start: performance.now() })
    if (solved && scrambledRef.current) {
      const tm = timerRef.current
      const end = performance.now()
      if (tm && !tm.end) {
        setTimer({ ...tm, end })
        setToast(tRef.current(L(`Xong rồi! ${fmt(end - tm.start)} giây`, `Solved in ${fmt(end - tm.start)}s!`)))
      } else setToast(tRef.current(L('Xong rồi!', 'Solved!')))
      setScrambled(null)
    }
  }, [])

  const onBlocked = useCallback(() => {
    mode.current = 'idle'
    setToast(tRef.current(L('Chưa thẳng hàng nên chưa cắt được. Xoay mặt trên hoặc dưới cho khớp trước đã.', 'The cut isn’t lined up yet. Turn the top or bottom until it is.')))
  }, [])

  const doMoves = useCallback((s: string) => {
    mode.current = 'idle'
    view.current?.run(s, true)
  }, [])

  const scramble = () => {
    const v = view.current
    if (!v) return
    const moves = randomScramble(def)
    v.reset()
    mode.current = 'scrambling'
    const prev = v.speed
    v.speed = 55
    v.run(moves, true, () => {
      v.speed = prev
      mode.current = 'idle'
    })
    setScrambled(formatMoves(def, moves))
    setHistory([])
    setTimer(null)
  }

  const reset = () => {
    view.current?.reset()
    setHistory([])
    setScrambled(null)
    setTimer(null)
  }

  const undo = () => {
    const v = view.current
    if (!v || !history.length || v.busy) return
    const last = parseTwisty(def, history[history.length - 1])
    if (!last) return
    mode.current = 'undo'
    v.run(invertMoves(last), true, () => (mode.current = 'idle'))
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || e.metaKey || e.ctrlKey || e.altKey) return
      const turn = entry.keys[e.key.toLowerCase()]
      if (turn) {
        e.preventDefault()
        doMoves(e.shiftKey ? `${turn}'` : turn)
      } else if (e.key === 'Backspace') {
        e.preventDefault()
        undo()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const elapsed = timer ? (timer.end ?? now) - timer.start : 0
  const validAlg = useMemo(() => (parseTwisty(def, alg)?.length ?? 0) > 0, [alg, def])

  const amounts = (turn: string) => {
    const order = def.turns[turn].order
    return order === 2 ? [1] : order === 3 ? [1, -1] : order === 12 ? [1, -1, 3] : [1, -1, 2]
  }

  return (
    <div className="play">
      <div className="play-stage stage">
        <TwistyStage entry={entry} dark={theme === 'dark'} speed={speed} onReady={onReady} onMove={onMove} onBlocked={onBlocked} appear={appear} />
        <div className="play-hud">
          <div className={`play-timer ${timer?.end ? 'done' : ''}`}>{timer ? fmt(elapsed) : scrambled ? t(L('Sẵn sàng', 'Ready')) : '0.00'}</div>
          <div className="muted small">{t(L(`${history.length} nước`, `${history.length} moves`))}</div>
        </div>
        <div className="play-hint">
          <span>
            <Hand size={13} /> {t(L('Kéo trên khối để xoay', 'Drag on the puzzle to turn'))}
          </span>
          <span>
            <Move3d size={13} /> {t(L('Kéo ra ngoài để xoay góc nhìn', 'Drag outside to look around'))}
          </span>
          <span className="hide-mobile">
            <Keyboard size={13} /> {t(entry.keyHint)}
          </span>
        </div>
      </div>

      <aside className="play-panel">
        <div className="card card-pad">
          <div className="panel-row">
            <h3 style={{ margin: 0 }}>{t(L('Chơi tự do', 'Free play'))}</h3>
            <PuzzlePicker value={entry.id} />
          </div>
          <p className="text-2 small" style={{ margin: '0 0 var(--sp-4)' }}>
            {t(entry.blurb)}
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
          </div>
          {scrambled && <p className="scramble-text">{scrambled}</p>}
        </div>

        <div className="card card-pad">
          <div className="panel-row" style={{ marginBottom: '0.75rem' }}>
            <h4 className="section-title" style={{ margin: 0 }}>
              {t(L('Bảng nút', 'Move pad'))}
            </h4>
            <span className="muted small truncate">{t(L("' = ngược chiều", "' = anticlockwise"))}</span>
          </div>
          {entry.pad.map((row, ri) => (
            <div key={ri} className="movepad" style={ri ? { marginTop: '0.5rem' } : undefined}>
              {row.map((turn) => (
                <div key={turn} className="movepad-col">
                  {amounts(turn).map((a) => {
                    const l = moveLabel(def, { turn, amount: a })
                    return (
                      <button key={l} type="button" className="move-btn" onClick={() => doMoves(l)}>
                        {l}
                      </button>
                    )
                  })}
                </div>
              ))}
            </div>
          ))}
        </div>

        <div className="card card-pad">
          <h4 className="section-title">{t(L('Chạy một chuỗi nước', 'Run a sequence'))}</h4>
          <form
            className="row nowrap"
            onSubmit={(e) => {
              e.preventDefault()
              if (validAlg) doMoves(alg)
            }}
          >
            <TextInput className="mono" value={alg} onChange={(e) => setAlg(e.target.value)} placeholder="R U R' U'" aria-label={t(L('Chuỗi nước', 'Moves'))} />
            <Button type="submit" variant="primary" icon={PlayIcon} disabled={!validAlg}>
              {t(L('Chạy', 'Run'))}
            </Button>
          </form>
        </div>

        <div className="card card-pad">
          <h4 className="section-title">{t(L('Tuỳ chỉnh', 'Settings'))}</h4>
          <div className="panel-row">
            <span className="panel-label">{t(L('Tốc độ xoay', 'Turn speed'))}</span>
            <Slider min={60} max={420} step={10} value={480 - speed} onChange={(v) => setSpeed(480 - v)} ariaLabel={t(L('Tốc độ xoay', 'Turn speed'))} />
          </div>
        </div>

        {history.length > 0 && (
          <div className="card card-pad">
            <div className="panel-row">
              <h4 className="section-title" style={{ margin: 0 }}>
                {t(L(`Lịch sử (${history.length})`, `History (${history.length})`))}
              </h4>
              <IconButton icon={Copy} size="sm" label={t(L('Sao chép', 'Copy'))} onClick={() => navigator.clipboard?.writeText(history.join(' '))} />
            </div>
            <p className="scramble-text" style={{ maxHeight: '7.5rem', overflow: 'auto' }}>
              {history.join(' ')}
            </p>
          </div>
        )}
      </aside>
      {toast && <Toast onDone={clearToast}>{toast}</Toast>}
    </div>
  )
}
