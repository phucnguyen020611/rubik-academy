import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, Move3d, Pause, Play, RotateCcw, SkipBack, SkipForward } from 'lucide-react'
import { CubeStage } from './CubeCanvas'
import type { CubeView } from './CubeView'
import { invertAlg, invertMove, parseAlg } from './engine'
import type { SchemeName } from './schemes'
import type { MaskName } from '../data/beginner'
import { useTheme } from '../theme'
import { useLang, L } from '../i18n'
import { Badge, Button, IconButton } from '../ui/Button'
import { Segmented } from '../ui/Form'

export interface AlgPlayerProps {
  alg: string
  pre?: string
  /** explicit setup instead of pre + inverse(alg) */
  setup?: string
  mask?: MaskName
  scheme?: SchemeName
  n?: number
  autoPlay?: boolean
  className?: string
}

const SPEEDS = [420, 260, 140]

export function AlgPlayer({ alg, pre = '', setup, mask, scheme = 'yellowTop', n = 3, autoPlay = false, className }: AlgPlayerProps) {
  const { theme } = useTheme()
  const { t } = useLang()
  const tokens = useMemo(() => parseAlg(alg, n), [alg, n])
  const setupStr = useMemo(() => setup ?? `${pre} ${invertAlg(alg, n)}`, [setup, pre, alg, n])
  const view = useRef<CubeView | null>(null)
  const pending = useRef(false)
  const [idx, setIdx] = useState(0)
  const [playing, setPlaying] = useState(autoPlay)
  const [speed, setSpeed] = useState(1)

  useEffect(() => {
    setIdx(0)
    pending.current = false
    setPlaying(autoPlay)
    view.current?.setup(setupStr)
  }, [setupStr, autoPlay])

  const onReady = useCallback(
    (v: CubeView) => {
      view.current = v
      v.speed = SPEEDS[speed]
    },
    [speed],
  )
  useEffect(() => {
    if (view.current) view.current.speed = SPEEDS[speed]
  }, [speed])

  const forward = useCallback(() => {
    const v = view.current
    if (!v || pending.current || idx >= tokens.length) return
    pending.current = true
    v.enqueue([tokens[idx].move], true, () => {
      pending.current = false
      setIdx((i) => i + 1)
    })
  }, [idx, tokens])

  const back = useCallback(() => {
    const v = view.current
    if (!v || pending.current || idx <= 0) return
    pending.current = true
    v.enqueue([invertMove(tokens[idx - 1].move)], true, () => {
      pending.current = false
      setIdx((i) => i - 1)
    })
  }, [idx, tokens])

  const jump = useCallback(
    (k: number) => {
      const v = view.current
      if (!v) return
      v.clearQueue()
      pending.current = false
      setPlaying(false)
      v.setup(`${setupStr} ${tokens.slice(0, k).map((x) => x.text).join(' ')}`)
      setIdx(k)
    },
    [setupStr, tokens],
  )

  useEffect(() => {
    if (!playing) return
    if (idx >= tokens.length) {
      const id = setTimeout(() => setPlaying(false), 50)
      return () => clearTimeout(id)
    }
    forward()
  }, [playing, idx, tokens.length, forward])

  const done = idx >= tokens.length
  const togglePlay = () => {
    if (done) {
      jump(0)
      setTimeout(() => setPlaying(true), 350)
      return
    }
    setPlaying((p) => !p)
  }

  const box = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = box.current
    if (!el) return
    const key = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') forward()
      else if (e.key === 'ArrowLeft') back()
      else if (e.key === ' ') togglePlay()
      else return
      e.preventDefault()
    }
    el.addEventListener('keydown', key)
    return () => el.removeEventListener('keydown', key)
  })

  return (
    <div className={`player ${className ?? ''}`} ref={box} tabIndex={0}>
      <div className="stage player-stage">
        <CubeStage n={n} scheme={scheme} mask={mask} setup={setupStr} onReady={onReady} dark={theme === 'dark'} size={3} />
        <div className="stage-hint">
          <Move3d size={14} />
          {t(L('Kéo để xoay góc nhìn', 'Drag to look around'))}
        </div>
        <div className="stage-count">
          <Badge tone="neutral">
            {idx}/{tokens.length}
          </Badge>
        </div>
      </div>
      <div className="alg-tokens" aria-label={t(L('Công thức', 'Algorithm'))}>
        {tokens.map((tk, i) => (
          <button key={i} type="button" className={i < idx ? 'done' : i === idx ? 'current' : ''} onClick={() => jump(i + 1)}>
            {tk.text}
          </button>
        ))}
      </div>
      <div className="player-controls">
        <IconButton icon={SkipBack} variant="secondary" size="sm" label={t(L('Về đầu', 'Restart'))} onClick={() => jump(0)} />
        <IconButton icon={ChevronLeft} variant="secondary" size="sm" label={t(L('Lùi một nước', 'Step back'))} onClick={back} disabled={idx === 0} />
        <Button variant="primary" size="sm" icon={playing ? Pause : done ? RotateCcw : Play} onClick={togglePlay} style={{ minWidth: '6.5rem' }}>
          {playing ? t(L('Dừng', 'Pause')) : done ? t(L('Xem lại', 'Replay')) : t(L('Phát', 'Play'))}
        </Button>
        <IconButton icon={ChevronRight} variant="secondary" size="sm" label={t(L('Tiến một nước', 'Step forward'))} onClick={forward} disabled={done} />
        <IconButton icon={SkipForward} variant="secondary" size="sm" label={t(L('Tới cuối', 'Jump to end'))} onClick={() => jump(tokens.length)} />
        <span className="spacer" />
        <Segmented size="sm" value={speed} onChange={setSpeed} ariaLabel={t(L('Tốc độ', 'Speed'))} options={[{ value: 0, label: '0.5×' }, { value: 1, label: '1×' }, { value: 2, label: '2×' }]} />
      </div>
    </div>
  )
}
