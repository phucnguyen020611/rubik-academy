import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Copy, Hand, Keyboard, Move3d, Play as PlayIcon, RotateCcw, ScanLine, Shuffle, Sparkles, Undo2 } from 'lucide-react'
import { CubeStage } from '../cube/CubeCanvas'
import type { CubeView } from '../cube/CubeView'
import { invertLabel, parseMoves, randomScramble, toFacelets, type Move } from '../cube/engine'
import { preloadSolver, solveFacelets } from '../cube/solver'
import { useStored, useTheme } from '../theme'
import { useLang, L } from '../i18n'
import { Button, Chip, IconButton } from '../ui/Button'
import { Segmented, Slider, TextInput } from '../ui/Form'
import { Toast } from '../ui/Overlay'

const FACE_KEYS = ['U', 'D', 'R', 'L', 'F', 'B']
const fmt = (ms: number) => {
  const s = ms / 1000
  const m = Math.floor(s / 60)
  return m ? `${m}:${(s % 60).toFixed(2).padStart(5, '0')}` : s.toFixed(2)
}

type Mode = 'idle' | 'scrambling' | 'solving' | 'undo'

export default function Play() {
  const { theme } = useTheme()
  const { t } = useLang()
  const [params, setParams] = useSearchParams()
  const n = Math.min(5, Math.max(2, Number(params.get('n')) || 3))
  const [scheme, setScheme] = useStored<'standard' | 'yellowTop'>('ra-play-scheme', 'standard')
  const [speed, setSpeed] = useStored('ra-play-speed', 180)
  const view = useRef<CubeView | null>(null)
  const mode = useRef<Mode>('idle')
  const [history, setHistory] = useState<string[]>([])
  const [scrambled, setScrambled] = useState<string | null>(null)
  const [timer, setTimer] = useState<{ start: number; end?: number } | null>(null)
  const [now, setNow] = useState(0)
  const [toast, setToast] = useState<string | null>(null)
  const [alg, setAlg] = useState('')
  const [solution, setSolution] = useState<string | null>(null)
  const [solving, setSolving] = useState(false)
  const [appear, setAppear] = useState(0)
  // a state handed over from the scanner (?state=<moves from solved>)
  const pending = useRef<string | null>(params.get('state'))

  useEffect(() => {
    if (n === 3) preloadSolver()
  }, [n])

  useEffect(() => {
    setHistory([])
    setScrambled(n === 3 && pending.current ? pending.current : null)
    setTimer(null)
    setSolution(null)
    setAppear((a) => a + 1)
  }, [n])

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

  const clearToast = useCallback(() => setToast(null), [])
  const onReady = useCallback((v: CubeView) => {
    view.current = v
    if (pending.current && v.n === 3) {
      v.setup(pending.current)
      pending.current = null
    }
  }, [])
  useEffect(() => {
    if (view.current) view.current.speed = speed
  }, [speed])

  const scrambledRef = useRef(scrambled)
  scrambledRef.current = scrambled
  const timerRef = useRef(timer)
  timerRef.current = timer
  const tRef = useRef(t)
  tRef.current = t

  const onMove = useCallback((m: Move, solved: boolean) => {
    const md = mode.current
    if (md === 'scrambling') return
    if (md === 'undo') setHistory((h) => h.slice(0, -1))
    else setHistory((h) => [...h, m.label])
    if (md === 'idle' && scrambledRef.current && !timerRef.current) setTimer({ start: performance.now() })
    if (solved && scrambledRef.current) {
      const tm = timerRef.current
      const end = performance.now()
      if (tm && !tm.end && md === 'idle') {
        setTimer({ ...tm, end })
        setToast(tRef.current(L(`Xong rồi! ${fmt(end - tm.start)} giây`, `Solved in ${fmt(end - tm.start)}s!`)))
      } else setToast(tRef.current(L('Xong rồi!', 'Solved!')))
      setScrambled(null)
    }
  }, [])

  const doMoves = useCallback((s: string) => {
    if (!view.current) return
    mode.current = 'idle'
    view.current.run(s, true)
  }, [])

  const scramble = () => {
    const v = view.current
    if (!v) return
    const s = randomScramble(n)
    v.reset()
    mode.current = 'scrambling'
    const prev = v.speed
    v.speed = 55
    v.run(s, true, () => {
      v.speed = prev
      mode.current = 'idle'
    })
    setScrambled(s)
    setHistory([])
    setTimer(null)
    setSolution(null)
  }

  const reset = () => {
    view.current?.reset()
    setHistory([])
    setScrambled(null)
    setTimer(null)
    setSolution(null)
  }

  const undo = () => {
    const v = view.current
    if (!v || !history.length || v.busy) return
    mode.current = 'undo'
    v.run(invertLabel(history[history.length - 1]), true, () => (mode.current = 'idle'))
  }

  const solve = async () => {
    const v = view.current
    if (!v || n !== 3) return
    if (v.busy) {
      setToast(t(L('Đợi khối xoay xong đã nhé', 'Wait for the cube to stop turning')))
      return
    }
    if (v.solved) {
      setToast(t(L('Khối đang ở trạng thái đã giải', 'The cube is already solved')))
      return
    }
    setSolving(true)
    try {
      const sol = await solveFacelets(toFacelets(v.state))
      setSolution(sol)
      mode.current = 'solving'
      v.run(sol, true, () => (mode.current = 'idle'))
    } catch {
      setToast(t(L('Không giải được trạng thái này', 'Could not solve this state')))
    } finally {
      setSolving(false)
    }
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || e.metaKey || e.ctrlKey || e.altKey) return
      const up = e.key.toUpperCase()
      if ([...FACE_KEYS, 'M', 'E', 'S', 'X', 'Y', 'Z'].includes(up)) {
        e.preventDefault()
        if (n < 3 && ['M', 'E', 'S'].includes(up)) return
        let label = ['X', 'Y', 'Z'].includes(up) ? up.toLowerCase() : up
        if (e.shiftKey) label += "'"
        doMoves(label)
      } else if (e.key === 'Backspace') {
        e.preventDefault()
        undo()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const elapsed = timer ? (timer.end ?? now) - timer.start : 0
  const validAlg = useMemo(() => parseMoves(alg, n).length > 0, [alg, n])

  const pad = (faces: string[]) =>
    faces.map((f) => (
      <div key={f} className="movepad-col">
        {[f, `${f}'`, `${f}2`].map((l) => (
          <button key={l} type="button" className="move-btn" onClick={() => doMoves(l)}>
            {l}
          </button>
        ))}
      </div>
    ))

  return (
    <div className="play">
      <div className="play-stage stage">
        <CubeStage n={n} scheme={scheme} interactive onReady={onReady} onMove={onMove} dark={theme === 'dark'} size={3} speed={speed} appear={appear} appearDelay={150} />
        <div className="play-hud">
          <div className={`play-timer ${timer?.end ? 'done' : ''}`}>{timer ? fmt(elapsed) : scrambled ? t(L('Sẵn sàng', 'Ready')) : '0.00'}</div>
          <div className="muted small">{t(L(`${history.length} nước`, `${history.length} moves`))}</div>
        </div>
        <div className="play-hint">
          <span>
            <Hand size={13} /> {t(L('Kéo trên khối để xoay tầng', 'Drag on the cube to turn'))}
          </span>
          <span>
            <Move3d size={13} /> {t(L('Kéo ra ngoài để xoay góc nhìn', 'Drag outside to look around'))}
          </span>
          <span className="hide-mobile">
            <Keyboard size={13} /> {t(L('Phím U R F D L B, Shift = ngược', 'Keys U R F D L B, Shift = prime'))}
          </span>
        </div>
      </div>

      <aside className="play-panel">
        <div className="card card-pad">
          <div className="panel-row">
            <h3 style={{ margin: 0 }}>{t(L('Chơi tự do', 'Free play'))}</h3>
            <Segmented size="sm" value={n} onChange={(v) => setParams({ n: String(v) })} ariaLabel={t(L('Cỡ khối', 'Cube size'))} options={[2, 3, 4, 5].map((s) => ({ value: s, label: `${s}×${s}` }))} />
          </div>
          <div className="action-grid">
            <Button variant="primary" icon={Shuffle} onClick={scramble}>
              {t(L('Xáo trộn', 'Scramble'))}
            </Button>
            {n === 3 ? (
              <Button variant="soft" icon={Sparkles} onClick={solve} disabled={solving}>
                {solving ? t(L('Đang tính…', 'Thinking…')) : t(L('Giải giúp', 'Solve'))}
              </Button>
            ) : (
              <Button variant="secondary" icon={RotateCcw} onClick={reset}>
                {t(L('Đặt lại', 'Reset'))}
              </Button>
            )}
            <Button variant="secondary" icon={Undo2} onClick={undo} disabled={!history.length}>
              {t(L('Hoàn tác', 'Undo'))}
            </Button>
            {n === 3 && (
              <Button variant="secondary" icon={RotateCcw} onClick={reset}>
                {t(L('Đặt lại', 'Reset'))}
              </Button>
            )}
          </div>
          {n === 3 && (
            <Button to="/scan" variant="ghost" size="sm" icon={ScanLine} block className="scan-link">
              {t(L('Quét khối thật bằng camera', 'Scan a real cube with your camera'))}
            </Button>
          )}
          {scrambled && <p className="scramble-text">{scrambled}</p>}
          {solution && (
            <p className="scramble-text">
              <span className="badge badge-green" style={{ marginRight: 6 }}>
                {t(L('Lời giải', 'Solution'))}
              </span>
              {solution}
            </p>
          )}
        </div>

        <div className="card card-pad">
          <div className="panel-row" style={{ marginBottom: '0.75rem' }}>
            <h4 className="section-title" style={{ margin: 0 }}>
              {t(L('Bảng nút', 'Move pad'))}
            </h4>
            <span className="muted small truncate">{t(L("' = ngược chiều", "' = anticlockwise"))}</span>
          </div>
          <div className="movepad">{pad(FACE_KEYS)}</div>
          <div className="movepad" style={{ marginTop: '0.5rem' }}>
            {pad(n >= 3 ? ['M', 'E', 'S', 'x', 'y', 'z'] : ['x', 'y', 'z'])}
          </div>
          {n >= 3 && (
            <div className="movepad" style={{ marginTop: '0.5rem' }}>
              {pad(['r', 'u', 'f', 'l', 'd', 'b'])}
            </div>
          )}
        </div>

        <div className="card card-pad">
          <h4 className="section-title">{t(L('Chạy một công thức', 'Run an algorithm'))}</h4>
          <form
            className="row nowrap"
            onSubmit={(e) => {
              e.preventDefault()
              if (validAlg) doMoves(alg)
            }}
          >
            <TextInput className="mono" value={alg} onChange={(e) => setAlg(e.target.value)} placeholder="R U R' U'" aria-label={t(L('Công thức', 'Algorithm'))} />
            <Button type="submit" variant="primary" icon={PlayIcon} disabled={!validAlg}>
              {t(L('Chạy', 'Run'))}
            </Button>
          </form>
          <div className="tabs" style={{ marginTop: '0.5rem' }}>
            {["R U R' U'", "F R U R' U' F'", "R U R' U R U2 R'", 'M2 E2 S2'].map((a) => (
              <Chip key={a} mono onClick={() => setAlg(a)}>
                {a}
              </Chip>
            ))}
          </div>
        </div>

        <div className="card card-pad">
          <h4 className="section-title">{t(L('Tuỳ chỉnh', 'Settings'))}</h4>
          <div className="panel-row">
            <span className="panel-label">{t(L('Màu mặt trên', 'Top colour'))}</span>
            <Segmented size="sm" value={scheme} onChange={setScheme} ariaLabel={t(L('Màu mặt trên', 'Top colour'))} options={[{ value: 'standard', label: t(L('Trắng', 'White')) }, { value: 'yellowTop', label: t(L('Vàng', 'Yellow')) }]} />
          </div>
          <div className="panel-row" style={{ marginTop: '0.75rem' }}>
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
