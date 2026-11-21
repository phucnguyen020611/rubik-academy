import { useMemo } from 'react'
import { FACE_GRID, FACE_NORMAL, invertAlg, stateFromAlg, stickers, type CubeState, type Face } from './engine'
import { COLORS, maskFn, schemeColors, type SchemeName } from './schemes'
import type { MaskName } from '../data/beginner'

export function caseState(alg: string, pre = '', n = 3): CubeState {
  return stateFromAlg(n, `${pre} ${invertAlg(alg, n)}`)
}

function colourOf(scheme: SchemeName, mask: MaskName | undefined, n: number) {
  const m = maskFn(mask)
  return (home: [number, number, number], homeFace: Face) => (m(home, homeFace, n) ? schemeColors(scheme)[homeFace] : COLORS.grey)
}

/** Top-down last-layer diagram (OLL / PLL style) with side stickers. */
export function LLDiagram({
  state,
  mask,
  scheme = 'yellowTop',
  className,
  arrows,
}: {
  state: CubeState
  mask?: MaskName
  scheme?: SchemeName
  className?: string
  arrows?: boolean
}) {
  const n = state.n
  const lim = n - 1
  const cell = 22
  const gap = 2.5
  const strip = 7
  const pad = 2
  const size = n * cell + (n - 1) * gap
  const off = pad + strip + gap * 1.6
  const total = off * 2 + size
  const col = colourOf(scheme, mask, n)
  const byHome = new Map(state.cubies.map((c) => [c.id, c.home]))
  const rects: React.ReactNode[] = []
  const idx = (d: number) => (d + lim) / 2
  for (const st of stickers(state)) {
    if (st.pos[1] !== lim) continue
    const fill = col(byHome.get(st.cubie)!, st.homeFace)
    const xi = idx(st.pos[0])
    const zi = idx(st.pos[2])
    const x = off + xi * (cell + gap)
    const y = off + zi * (cell + gap)
    const key = `${st.cubie}-${st.face}`
    if (st.face === 'U') rects.push(<rect key={key} x={x} y={y} width={cell} height={cell} rx={4} fill={fill} />)
    else if (st.face === 'B') rects.push(<rect key={key} x={x} y={pad} width={cell} height={strip} rx={2} fill={fill} />)
    else if (st.face === 'F') rects.push(<rect key={key} x={x} y={total - pad - strip} width={cell} height={strip} rx={2} fill={fill} />)
    else if (st.face === 'L') rects.push(<rect key={key} x={pad} y={y} width={strip} height={cell} rx={2} fill={fill} />)
    else if (st.face === 'R') rects.push(<rect key={key} x={total - pad - strip} y={y} width={strip} height={cell} rx={2} fill={fill} />)
  }
  // PLL arrows: where does the piece currently at each U position need to go?
  const arrowEls: React.ReactNode[] = []
  if (arrows) {
    const centre = (p: number[]) => [off + idx(p[0]) * (cell + gap) + cell / 2, off + idx(p[2]) * (cell + gap) + cell / 2]
    for (const c of state.cubies) {
      if (c.pos[1] !== lim || c.home[1] !== lim) continue
      if (c.pos[0] === c.home[0] && c.pos[2] === c.home[2]) continue
      if (c.pos[0] === 0 && c.pos[2] === 0) continue
      const [x1, y1] = centre(c.pos)
      const [x2, y2] = centre(c.home)
      const dx = x2 - x1
      const dy = y2 - y1
      const L = Math.hypot(dx, dy)
      const ux = dx / L
      const uy = dy / L
      const sx = x1 + ux * 6
      const sy = y1 + uy * 6
      const ex = x2 - ux * 6
      const ey = y2 - uy * 6
      arrowEls.push(
        <g key={`a${c.id}`} stroke="#0c1e13" fill="#0c1e13" opacity={0.85}>
          <line x1={sx} y1={sy} x2={ex} y2={ey} strokeWidth={2} strokeLinecap="round" />
          <path d={`M${ex},${ey} l${-ux * 6 - uy * 4},${-uy * 6 + ux * 4} l${uy * 8},${-ux * 8} z`} stroke="none" />
        </g>,
      )
    }
  }
  return (
    <svg className={className} viewBox={`0 0 ${total} ${total}`} role="img">
      <rect x={off - gap} y={off - gap} width={size + gap * 2} height={size + gap * 2} rx={6} fill="#151816" />
      {rects}
      {arrowEls}
    </svg>
  )
}

/** Isometric view of the U, F and R faces. */
export function IsoCube({ state, mask, scheme = 'yellowTop', className }: { state: CubeState; mask?: MaskName; scheme?: SchemeName; className?: string }) {
  const n = state.n
  const h = n / 2
  const c30 = Math.cos(Math.PI / 6)
  const proj = (p: number[]) => [(p[0] - p[2]) * c30, -p[1] + (p[0] + p[2]) * 0.5]
  const col = colourOf(scheme, mask, n)
  const byHome = new Map(state.cubies.map((c) => [c.id, c.home]))
  const polys: React.ReactNode[] = []
  const faces: Face[] = ['U', 'F', 'R']
  const shade: Record<string, number> = { U: 1, F: 0.86, R: 0.74 }
  for (const f of faces) {
    const nv = FACE_NORMAL[f]
    const { right, down } = FACE_GRID[f]
    const quad = (cx: number, cy: number, s: number) =>
      [
        [-1, -1],
        [1, -1],
        [1, 1],
        [-1, 1],
      ]
        .map(([a, b]) => {
          const p = [0, 1, 2].map((k) => nv[k] * h + right[k] * (cx + a * s) + down[k] * (cy + b * s))
          return proj(p).join(',')
        })
        .join(' ')
    polys.push(<polygon key={`bg${f}`} points={quad(0, 0, h)} fill="#121513" stroke="#121513" strokeWidth={0.08} strokeLinejoin="round" />)
  }
  for (const st of stickers(state)) {
    if (!faces.includes(st.face)) continue
    const nv = FACE_NORMAL[st.face]
    const { right, down } = FACE_GRID[st.face]
    const dot = (a: number[], b: number[]) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
    const cx = dot(st.pos, right) / 2
    const cy = dot(st.pos, down) / 2
    const s = 0.42
    const pts = [
      [-1, -1],
      [1, -1],
      [1, 1],
      [-1, 1],
    ]
      .map(([a, b]) => {
        const p = [0, 1, 2].map((k) => nv[k] * h + right[k] * (cx + a * s) + down[k] * (cy + b * s))
        return proj(p).join(',')
      })
      .join(' ')
    polys.push(
      <polygon
        key={`${st.cubie}${st.face}`}
        points={pts}
        fill={col(byHome.get(st.cubie)!, st.homeFace)}
        style={{ filter: `brightness(${shade[st.face]})` }}
        strokeLinejoin="round"
      />,
    )
  }
  const w = n * c30 * 2
  return (
    <svg className={className} viewBox={`${-w / 2 - 0.2} ${-h - 0.2 - n * 0.5} ${w + 0.4} ${n * 2 + 0.4}`} role="img">
      {polys}
    </svg>
  )
}

/** Unfolded net (for scramble previews). */
export function NetDiagram({ state, scheme = 'standard', className }: { state: CubeState; scheme?: SchemeName; className?: string }) {
  const n = state.n
  const cell = 10
  const fw = n * cell + 2
  const pos: Record<Face, [number, number]> = { U: [1, 0], L: [0, 1], F: [1, 1], R: [2, 1], B: [3, 1], D: [1, 2] }
  const grid = useMemo(() => {
    const out: { f: Face; r: number; c: number; home: Face }[] = []
    const s = stickers(state)
    for (const f of Object.keys(pos) as Face[]) {
      const { right, down } = FACE_GRID[f]
      for (const st of s) {
        if (st.face !== f) continue
        const dot = (a: number[], b: number[]) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
        out.push({ f, c: (dot(st.pos, right) + n - 1) / 2, r: (dot(st.pos, down) + n - 1) / 2, home: st.homeFace })
      }
    }
    return out
  }, [state]) // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <svg className={className} viewBox={`0 0 ${fw * 4} ${fw * 3}`} role="img">
      {grid.map((g, i) => (
        <rect
          key={i}
          x={pos[g.f][0] * fw + 1 + g.c * cell + 0.6}
          y={pos[g.f][1] * fw + 1 + g.r * cell + 0.6}
          width={cell - 1.2}
          height={cell - 1.2}
          rx={1.6}
          fill={schemeColors(scheme)[g.home]}
          stroke="rgba(0,0,0,.35)"
          strokeWidth={0.4}
        />
      ))}
    </svg>
  )
}
