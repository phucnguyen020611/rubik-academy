import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle, Box, Camera, CameraOff, CheckCircle2, Grid3x3, RefreshCw, ScanLine, Sparkles, Wand2 } from 'lucide-react'
import { PageHead } from '../components/Shared'
import { AlgPlayer } from '../cube/AlgPlayer'
import { invertAlg, type Face } from '../cube/engine'
import { classify, hexToOklab, matchPalette, rgbToOklab, stickerColour, toFaceletString, validateFacelets, FACE_ORDER, type Lab, type ScanError } from '../cube/scan'
import { solveFacelets, preloadSolver } from '../cube/solver'
import { PALETTE } from '../cube/schemes'
import { useLang, L, type Tx } from '../i18n'
import { Badge, Button } from '../ui/Button'
import { Switch } from '../ui/Form'

// ------------------------------------------------------------------ capture order and instructions
const STEPS: { face: number; name: Tx; how: Tx }[] = [
  { face: 2, name: L('Mặt trước', 'Front'), how: L('Cầm khối với tâm trắng ở trên, tâm xanh lá hướng vào camera.', 'Hold the cube with white on top and the green centre facing the camera.') },
  { face: 1, name: L('Mặt phải', 'Right'), how: L('Xoay cả khối sang trái một góc vuông để mặt bên phải ra trước. Trắng vẫn ở trên.', 'Turn the whole cube a quarter to the left so the right face comes to the front. White stays on top.') },
  { face: 5, name: L('Mặt sau', 'Back'), how: L('Xoay tiếp sang trái một góc vuông. Trắng vẫn ở trên.', 'Another quarter turn to the left. White stays on top.') },
  { face: 4, name: L('Mặt trái', 'Left'), how: L('Xoay tiếp sang trái một góc vuông. Trắng vẫn ở trên.', 'One more quarter turn to the left. White stays on top.') },
  { face: 0, name: L('Mặt trên', 'Top'), how: L('Quay lại tư thế đầu (xanh lá ở trước), rồi ngửa khối cho mặt trắng nhìn vào camera, mặt xanh lá quay xuống dưới.', 'Go back to the start (green in front), then tip the cube so white faces the camera and green points down.') },
  { face: 3, name: L('Mặt dưới', 'Bottom'), how: L('Từ tư thế đầu, lật khối cho mặt vàng nhìn vào camera, mặt xanh lá quay lên trên.', 'From the start, flip the cube so yellow faces the camera and green points up.') },
]

/** the default colour of each face's centre for manual entry: U white, R red, F green, D yellow, L orange, B blue */
const DEFAULT_CENTRES = [0, 4, 2, 1, 5, 3]
const PAL_LAB = PALETTE.map(hexToOklab)

const SIZE = 480
const GUIDE = SIZE * 0.72
const CELL = GUIDE / 3
const G0 = (SIZE - GUIDE) / 2

type Phase = 'capture' | 'review' | 'solved'

function sampleIndices(cx: number, cy: number, half: number) {
  const idx: number[] = []
  for (let y = Math.round(cy - half); y <= cy + half; y += 2) for (let x = Math.round(cx - half); x <= cx + half; x += 2) idx.push((y * SIZE + x) * 4)
  return idx
}
const CELL_IDX = Array.from({ length: 9 }, (_, i) => sampleIndices(G0 + (i % 3) * CELL + CELL / 2, G0 + Math.floor(i / 3) * CELL + CELL / 2, CELL * 0.2))
/** pixels on the lines between stickers (the plastic body) */
const LINE_IDX = (() => {
  const idx: number[] = []
  for (const k of [1, 2])
    for (let t = G0 + 6; t < G0 + GUIDE - 6; t += 4) {
      const a = Math.round(G0 + k * CELL)
      idx.push((Math.round(t) * SIZE + a) * 4, (a * SIZE + Math.round(t)) * 4)
    }
  return idx
})()

const labToCss = (c: Lab) => {
  // OKLab back to sRGB for the live swatches
  const l = Math.pow(c[0] + 0.3963377774 * c[1] + 0.2158037573 * c[2], 3)
  const m = Math.pow(c[0] - 0.1055613458 * c[1] - 0.0638541728 * c[2], 3)
  const s = Math.pow(c[0] - 0.0894841775 * c[1] - 1.291485548 * c[2], 3)
  const lin = [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s, -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s]
  const g = lin.map((v) => Math.round(255 * Math.min(1, Math.max(0, v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(v, 1 / 2.4) - 0.055))))
  return `rgb(${g.join(',')})`
}

export default function Scan() {
  const { t } = useLang()
  const navigate = useNavigate()
  const [phase, setPhase] = useState<Phase>('capture')
  const [step, setStep] = useState(0)
  const [faces, setFaces] = useState<(Lab[] | null)[]>(() => new Array(6).fill(null))
  const [camError, setCamError] = useState<string | null>(null)
  const [auto, setAuto] = useState(true)
  const [flash, setFlash] = useState(false)
  const [stickers, setStickers] = useState<(number | null)[]>(() => new Array(54).fill(null))
  const [confidence, setConfidence] = useState<number[]>(() => new Array(54).fill(1))
  const [brush, setBrush] = useState(0)
  const [solution, setSolution] = useState<string | null>(null)
  const [solving, setSolving] = useState(false)

  const video = useRef<HTMLVideoElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const stream = useRef<MediaStream | null>(null)
  const [mirror, setMirror] = useState(true)
  const live = useRef<Lab[] | null>(null)
  const stepRef = useRef(step)
  stepRef.current = step
  const autoRef = useRef(auto)
  autoRef.current = auto

  useEffect(() => preloadSolver(), [])

  // ---------------------------------------------------------------- camera
  const stopCamera = useCallback(() => {
    stream.current?.getTracks().forEach((tr) => tr.stop())
    stream.current = null
  }, [])

  useEffect(() => {
    if (phase !== 'capture') return
    let alive = true
    if (!navigator.mediaDevices?.getUserMedia) {
      setCamError('unsupported')
      return
    }
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false })
      .then((s) => {
        if (!alive) return s.getTracks().forEach((tr) => tr.stop())
        stream.current = s
        const facing = s.getVideoTracks()[0]?.getSettings().facingMode
        setMirror(facing !== 'environment')
        if (video.current) {
          video.current.srcObject = s
          video.current.play().catch(() => {})
        }
        setCamError(null)
      })
      .catch((e: Error) => alive && setCamError(e.name || 'error'))
    return () => {
      alive = false
      stopCamera()
    }
  }, [phase, stopCamera])

  const capture = useCallback((colours: Lab[]) => {
    const s = stepRef.current
    setFaces((f) => {
      const next = [...f]
      next[STEPS[s].face] = colours
      return next
    })
    setFlash(true)
    setTimeout(() => setFlash(false), 250)
    setStep((cur) => Math.min(STEPS.length, cur + 1))
  }, [])

  // draw loop + live sampling + auto capture when the cube is held still
  useEffect(() => {
    if (phase !== 'capture') return
    const ctx = canvas.current?.getContext('2d', { willReadFrequently: true })
    if (!ctx) return
    let raf = 0
    let prev: Lab[] | null = null
    let stillSince = 0
    let armed = true
    const loop = () => {
      raf = requestAnimationFrame(loop)
      const v = video.current
      if (!v || v.readyState < 2 || !v.videoWidth) return
      const m = Math.min(v.videoWidth, v.videoHeight)
      ctx.drawImage(v, (v.videoWidth - m) / 2, (v.videoHeight - m) / 2, m, m, 0, 0, SIZE, SIZE)
      const px = ctx.getImageData(0, 0, SIZE, SIZE).data
      const cols = CELL_IDX.map((idx) => stickerColour(px, idx) ?? ([0, 0, 0] as Lab))
      live.current = cols
      // grid overlay with live swatches
      ctx.lineWidth = 3
      ctx.strokeStyle = 'rgba(255,255,255,0.9)'
      for (let i = 0; i < 9; i++) {
        const x = G0 + (i % 3) * CELL
        const y = G0 + Math.floor(i / 3) * CELL
        ctx.strokeRect(x + 4, y + 4, CELL - 8, CELL - 8)
        ctx.fillStyle = labToCss(cols[i])
        ctx.beginPath()
        ctx.arc(x + CELL / 2, y + CELL / 2, 11, 0, Math.PI * 2)
        ctx.fill()
        ctx.stroke()
      }
      if (stepRef.current >= STEPS.length) return
      // stability + "looks like a cube": the lines between stickers are darker than the stickers
      const delta = prev ? cols.reduce((a, c, i) => a + Math.hypot(c[0] - prev![i][0], c[1] - prev![i][1], c[2] - prev![i][2]), 0) / 9 : 1
      prev = cols
      let lineL = 0
      for (const i of LINE_IDX) lineL += rgbToOklab(px[i], px[i + 1], px[i + 2])[0]
      lineL /= LINE_IDX.length
      const cellL = cols.reduce((a, c) => a + c[0], 0) / 9
      const cubeLike = cellL - lineL > 0.12
      if (!armed && delta > 0.06) armed = true
      const now = performance.now()
      if (delta < 0.02 && cubeLike) {
        if (!stillSince) stillSince = now
        if (armed && autoRef.current && now - stillSince > 700) {
          armed = false
          stillSince = 0
          capture(cols)
        }
      } else stillSince = 0
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [phase, capture])

  // all six faces in → classify
  useEffect(() => {
    if (phase !== 'capture' || faces.some((f) => !f)) return
    const all = faces.flatMap((f) => f!) as Lab[]
    const res = classify(all)
    const map = matchPalette(res.means, PAL_LAB)
    setStickers(res.cluster.map((k) => map[k]))
    setConfidence(res.confidence)
    stopCamera()
    setPhase('review')
  }, [faces, phase, stopCamera])

  const startManual = () => {
    stopCamera()
    const s = new Array(54).fill(null) as (number | null)[]
    DEFAULT_CENTRES.forEach((c, f) => (s[f * 9 + 4] = c))
    setStickers(s)
    setConfidence(new Array(54).fill(1))
    setPhase('review')
  }
  const restart = () => {
    setFaces(new Array(6).fill(null))
    setStep(0)
    setSolution(null)
    setPhase('capture')
  }

  // ---------------------------------------------------------------- review
  const facelets = useMemo(() => toFaceletString(stickers), [stickers])
  const error: ScanError | null | 'incomplete' = useMemo(() => {
    if (stickers.some((s) => s === null)) return 'incomplete'
    if (!facelets) return { kind: 'centres' }
    return validateFacelets(facelets)
  }, [stickers, facelets])
  const badSet = new Set(error && error !== 'incomplete' && 'at' in error ? error.at : [])
  const counts = PALETTE.map((_, c) => stickers.filter((s) => s === c).length)

  const errorText = (e: typeof error): string => {
    if (!e) return ''
    if (e === 'incomplete') return t(L('Còn ô chưa có màu. Chọn màu bên dưới rồi bấm vào ô để tô.', 'Some stickers have no colour yet. Pick a colour below and tap a sticker to paint it.'))
    switch (e.kind) {
      case 'count':
        return t(L('Mỗi màu phải có đúng 9 ô. Con số trên từng màu bên dưới cho biết màu nào đang thừa hoặc thiếu.', 'Each colour must appear exactly 9 times. The number on each colour below shows which ones are over or under.'))
      case 'centres':
        return t(L('6 ô tâm phải là 6 màu khác nhau.', 'The six centres must all be different colours.'))
      case 'corner':
        return t(L('Có một góc mang tổ hợp màu không tồn tại (ô viền đỏ).', 'One corner has a colour combination that does not exist (outlined in red).'))
      case 'edge':
        return t(L('Có một cạnh mang tổ hợp màu không tồn tại (ô viền đỏ).', 'One edge has a colour combination that does not exist (outlined in red).'))
      case 'twist':
        return t(L('Có một góc bị xoay sai. Có thể đọc nhầm màu, hoặc khối bị vặn góc thật.', 'A corner is twisted. Either a colour was misread or the cube itself has a twisted corner.'))
      case 'flip':
        return t(L('Có một cạnh bị lật. Có thể đọc nhầm màu, hoặc khối từng bị tháo lắp sai.', 'An edge is flipped. Either a colour was misread or the cube was reassembled wrong.'))
      case 'parity':
        return t(L('Hai viên bị đổi chỗ. Thường do đọc nhầm hai ô gần màu nhau, ví dụ đỏ và cam.', 'Two pieces look swapped. Usually two similar colours were misread, like red and orange.'))
    }
  }

  const solve = async () => {
    if (!facelets || error) return
    setSolving(true)
    try {
      const sol = await solveFacelets(facelets)
      setSolution(sol.trim())
      setPhase('solved')
    } finally {
      setSolving(false)
    }
  }

  /** colours of the user's own cube, so the 3D view looks like what they hold */
  const scheme = useMemo(() => {
    const s = {} as Record<Face, string>
    FACE_ORDER.forEach((f, k) => (s[f as Face] = PALETTE[stickers[k * 9 + 4] ?? DEFAULT_CENTRES[k]]))
    return s
  }, [stickers])

  const doneCount = faces.filter(Boolean).length
  const cur = STEPS[Math.min(step, STEPS.length - 1)]

  return (
    <div className="page">
      <div className="container">
        <PageHead crumbs={[{ to: '/play', label: t(L('Chơi tự do', 'Free play')) }]} eyebrow={t(L('Công cụ', 'Tools'))} title={t(L('Quét khối của bạn', 'Scan your cube'))}>
          <p>{t(L('Chụp lần lượt 6 mặt, trang sẽ tự đọc màu rồi chỉ cách giải. Ảnh chỉ được xử lý ngay trên máy bạn, không gửi đi đâu cả.', 'Show each of the six faces to the camera and the page reads the colours, then shows you a solution. Images are processed on your device and never uploaded.'))}</p>
        </PageHead>

        {phase === 'capture' && (
          <div className="scan">
            <div className="scan-cam card">
              <div className={`scan-view ${flash ? 'flash' : ''}`}>
                <video ref={video} playsInline muted className="scan-video" />
                <canvas ref={canvas} width={SIZE} height={SIZE} className="scan-canvas" style={{ transform: mirror ? 'scaleX(-1)' : undefined }} />
                {camError && (
                  <div className="scan-cam-error">
                    <CameraOff size={28} />
                    <p>
                      {camError === 'NotAllowedError'
                        ? t(L('Bạn chưa cho phép dùng camera. Hãy bật quyền camera cho trang này, hoặc nhập màu bằng tay.', 'Camera access was blocked. Allow the camera for this page, or enter the colours by hand.'))
                        : t(L('Không mở được camera trên thiết bị này. Bạn có thể nhập màu bằng tay.', 'Could not open a camera on this device. You can enter the colours by hand.'))}
                    </p>
                    <Button variant="primary" icon={Grid3x3} onClick={startManual}>
                      {t(L('Nhập bằng tay', 'Enter by hand'))}
                    </Button>
                  </div>
                )}
              </div>
              <div className="scan-controls">
                <Switch checked={auto} onChange={setAuto} label={t(L('Tự chụp khi khối đứng yên', 'Capture when the cube is still'))} />
                <Button variant="primary" icon={Camera} disabled={!!camError || step >= STEPS.length} onClick={() => live.current && capture(live.current)}>
                  {t(L('Chụp', 'Capture'))}
                </Button>
              </div>
            </div>

            <aside className="scan-side">
              <div className="card card-pad">
                <div className="panel-row">
                  <span className="eyebrow">{t(L(`Mặt ${Math.min(step + 1, 6)} / 6`, `Face ${Math.min(step + 1, 6)} of 6`))}</span>
                  <Badge tone={doneCount === 6 ? 'green' : 'neutral'}>{doneCount}/6</Badge>
                </div>
                <h3 style={{ margin: 'var(--sp-2) 0 var(--sp-1)' }}>{t(cur.name)}</h3>
                <p className="text-2 small" style={{ margin: 0 }}>
                  {t(cur.how)}
                </p>
                <FaceMap active={cur.face} done={faces.map(Boolean)} />
                <p className="muted small" style={{ margin: 0 }}>
                  {t(L('Đặt khối vừa khung 3×3, nơi đủ sáng và không bị loá.', 'Fit the cube inside the 3×3 frame, in good light without glare.'))}
                </p>
              </div>
              <div className="card card-pad scan-thumbs">
                {STEPS.map((s, i) => {
                  const f = faces[s.face]
                  return (
                    <button key={s.face} type="button" className={`scan-thumb ${i === step ? 'current' : ''}`} onClick={() => setStep(i)} aria-label={t(s.name)}>
                      <span className="scan-thumb-grid">
                        {Array.from({ length: 9 }, (_, j) => (
                          <span key={j} style={{ background: f ? labToCss(f[j]) : undefined }} />
                        ))}
                      </span>
                      <span className="scan-thumb-label">{t(s.name)}</span>
                    </button>
                  )
                })}
              </div>
              <Button variant="ghost" icon={Grid3x3} onClick={startManual}>
                {t(L('Bỏ qua camera, nhập bằng tay', 'Skip the camera, enter by hand'))}
              </Button>
            </aside>
          </div>
        )}

        {phase === 'review' && (
          <div className="scan">
            <div className="card card-pad scan-review">
              <div className="panel-row">
                <h3 style={{ margin: 0 }}>{t(L('Kiểm tra lại màu', 'Check the colours'))}</h3>
                <Button variant="ghost" size="sm" icon={RefreshCw} onClick={restart}>
                  {t(L('Chụp lại', 'Rescan'))}
                </Button>
              </div>
              <p className="text-2 small">{t(L('Bấm một màu bên dưới, rồi bấm vào ô nào bị sai để sửa. Ô có viền vàng là những ô trang chưa chắc chắn.', 'Pick a colour below, then tap any wrong sticker to fix it. Stickers outlined in yellow are the ones the page is least sure about.'))}</p>
              <NetEditor stickers={stickers} unsure={confidence.map((c) => c < 0.3)} bad={badSet} onPaint={(i) => setStickers((s) => s.map((x, j) => (j === i ? brush : x)))} />
              <div className="palette" role="radiogroup" aria-label={t(L('Màu để tô', 'Paint colour'))}>
                {PALETTE.map((c, k) => (
                  <button key={c} type="button" role="radio" aria-checked={brush === k} className={`swatch ${brush === k ? 'active' : ''}`} style={{ background: c }} onClick={() => setBrush(k)}>
                    <span className={counts[k] === 9 ? 'ok' : 'off'}>{counts[k]}</span>
                  </button>
                ))}
              </div>
            </div>
            <aside className="scan-side">
              <div className={`card card-pad scan-status ${error ? 'warn' : 'ok'}`}>
                {error ? <AlertTriangle size={20} /> : <CheckCircle2 size={20} />}
                <div>
                  <strong>{error ? t(L('Chưa hợp lệ', 'Not valid yet')) : t(L('Khối hợp lệ', 'Looks good'))}</strong>
                  <p className="small" style={{ margin: 'var(--sp-1) 0 0' }}>
                    {error ? errorText(error) : t(L('Mọi viên đều khớp. Sẵn sàng tìm lời giải.', 'Every piece checks out. Ready to solve.'))}
                  </p>
                </div>
              </div>
              <Button variant="primary" size="lg" icon={Sparkles} disabled={!!error || solving} onClick={solve} block>
                {solving ? t(L('Đang tìm lời giải…', 'Finding a solution…')) : t(L('Tìm lời giải', 'Solve it'))}
              </Button>
            </aside>
          </div>
        )}

        {phase === 'solved' && solution === '' && (
          <div className="card card-pad scan-status ok" style={{ maxWidth: '32rem' }}>
            <CheckCircle2 size={20} />
            <div>
              <strong>{t(L('Khối này đã giải xong rồi!', 'This cube is already solved!'))}</strong>
              <div style={{ marginTop: 'var(--sp-3)' }}>
                <Button variant="secondary" size="sm" icon={ScanLine} onClick={restart}>
                  {t(L('Quét khối khác', 'Scan another cube'))}
                </Button>
              </div>
            </div>
          </div>
        )}

        {phase === 'solved' && !!solution && (
          <div className="scan">
            <div className="scan-solved">
              <AlgPlayer alg={solution} setup={invertAlg(solution)} scheme={scheme} />
            </div>
            <aside className="scan-side">
              <div className="card card-pad">
                <div className="row" style={{ gap: 'var(--sp-2)' }}>
                  <Wand2 size={18} className="text-2" />
                  <h3 style={{ margin: 0 }}>{t(L(`Lời giải ${solution.split(' ').filter(Boolean).length} nước`, `${solution.split(' ').filter(Boolean).length}-move solution`))}</h3>
                </div>
                <p className="text-2 small" style={{ margin: 'var(--sp-2) 0 0' }}>
                  {t(L('Cầm khối như lúc chụp mặt trước: trắng ở trên, xanh lá hướng về bạn. Làm theo từng nước bên trái.', 'Hold the cube as for the front photo: white on top, green facing you. Follow the moves on the left.'))}
                </p>
              </div>
              <Button variant="secondary" icon={Box} onClick={() => navigate(`/play?state=${encodeURIComponent(invertAlg(solution))}`)} block>
                {t(L('Mở trong Chơi tự do', 'Open in free play'))}
              </Button>
              <Button variant="ghost" icon={ScanLine} onClick={restart} block>
                {t(L('Quét khối khác', 'Scan another cube'))}
              </Button>
            </aside>
          </div>
        )}
      </div>
    </div>
  )
}

/** Small unfolded-cube map showing which face to show next. */
function FaceMap({ active, done }: { active: number; done: boolean[] }) {
  // grid positions of U R F D L B in a cross layout
  const pos: [number, number][] = [
    [1, 0],
    [2, 1],
    [1, 1],
    [1, 2],
    [0, 1],
    [3, 1],
  ]
  return (
    <svg className="face-map" viewBox="0 0 84 63" aria-hidden>
      {pos.map(([x, y], k) => (
        <rect key={k} x={x * 21 + 1} y={y * 21 + 1} width={19} height={19} rx={4} className={k === active ? 'active' : done[k] ? 'done' : ''} />
      ))}
    </svg>
  )
}

/** Editable unfolded cube: U on top, L F R B across, D below. */
function NetEditor({ stickers, unsure, bad, onPaint }: { stickers: (number | null)[]; unsure: boolean[]; bad: Set<number>; onPaint: (i: number) => void }) {
  const layout: [number, number][] = [
    [1, 0],
    [2, 1],
    [1, 1],
    [1, 2],
    [0, 1],
    [3, 1],
  ]
  return (
    <div className="net-editor">
      {FACE_ORDER.map((f, k) => (
        <div key={f} className="net-face" style={{ gridColumn: layout[k][0] + 1, gridRow: layout[k][1] + 1 }}>
          {Array.from({ length: 9 }, (_, j) => {
            const i = k * 9 + j
            const c = stickers[i]
            return (
              <button
                key={j}
                type="button"
                className={`net-cell ${c === null ? 'empty' : ''} ${bad.has(i) ? 'bad' : unsure[i] ? 'unsure' : ''} ${j === 4 ? 'centre' : ''}`}
                style={{ background: c === null ? undefined : PALETTE[c] }}
                onClick={() => onPaint(i)}
                aria-label={`${f}${j + 1}`}
              />
            )
          })}
        </div>
      ))}
    </div>
  )
}
