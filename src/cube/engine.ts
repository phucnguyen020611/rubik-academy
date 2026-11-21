/**
 * Pure NxN cube engine (no three.js) – usable in the browser, in workers and in node tests.
 *
 * Coordinates are "doubled" integers so even-sized cubes stay integral:
 *   layer index i ∈ [0, n-1]  ->  d = 2i - (n-1)
 * Axes: x = R(+)/L(-), y = U(+)/D(-), z = F(+)/B(-)  (three.js, y-up).
 */

export type Vec = [number, number, number]
export type Mat = number[] // 3x3 row-major integer rotation
export type Face = 'U' | 'D' | 'F' | 'B' | 'R' | 'L'
export type Axis = 0 | 1 | 2

export interface Cubie {
  id: number
  home: Vec
  pos: Vec
  rot: Mat
}

export interface CubeState {
  n: number
  cubies: Cubie[]
}

export interface Move {
  axis: Axis
  layers: number[]
  /** signed quarter turns about the +axis (right-hand rule) */
  q: number
  label: string
}

export const FACES: Face[] = ['U', 'R', 'F', 'D', 'L', 'B']

export const FACE_NORMAL: Record<Face, Vec> = {
  U: [0, 1, 0],
  D: [0, -1, 0],
  R: [1, 0, 0],
  L: [-1, 0, 0],
  F: [0, 0, 1],
  B: [0, 0, -1],
}

export function normalToFace(v: Vec): Face {
  if (v[1] > 0) return 'U'
  if (v[1] < 0) return 'D'
  if (v[0] > 0) return 'R'
  if (v[0] < 0) return 'L'
  if (v[2] > 0) return 'F'
  return 'B'
}

const I3: Mat = [1, 0, 0, 0, 1, 0, 0, 0, 1]
const ROT90: Mat[] = [
  [1, 0, 0, 0, 0, -1, 0, 1, 0], // +x
  [0, 0, 1, 0, 1, 0, -1, 0, 0], // +y
  [0, -1, 0, 1, 0, 0, 0, 0, 1], // +z
]

export function matMul(a: Mat, b: Mat): Mat {
  const r = new Array(9).fill(0)
  for (let i = 0; i < 3; i++)
    for (let j = 0; j < 3; j++) r[i * 3 + j] = a[i * 3] * b[j] + a[i * 3 + 1] * b[3 + j] + a[i * 3 + 2] * b[6 + j]
  return r
}

export function matVec(m: Mat, v: Vec): Vec {
  return [
    m[0] * v[0] + m[1] * v[1] + m[2] * v[2],
    m[3] * v[0] + m[4] * v[1] + m[5] * v[2],
    m[6] * v[0] + m[7] * v[1] + m[8] * v[2],
  ]
}

/** ROT[axis][k] = rotation by k * 90° about +axis */
const ROT: Mat[][] = ROT90.map((r) => {
  const out: Mat[] = [I3]
  for (let k = 1; k < 4; k++) out.push(matMul(r, out[k - 1]))
  return out
})

export function rotationMatrix(axis: Axis, q: number): Mat {
  return ROT[axis][((q % 4) + 4) % 4]
}

export function createCube(n: number): CubeState {
  const cubies: Cubie[] = []
  const c = n - 1
  let id = 0
  for (let i = 0; i < n; i++)
    for (let j = 0; j < n; j++)
      for (let k = 0; k < n; k++) {
        if (n > 1 && i > 0 && i < c && j > 0 && j < c && k > 0 && k < c) continue
        const p: Vec = [2 * i - c, 2 * j - c, 2 * k - c]
        cubies.push({ id: id++, home: p, pos: [...p] as Vec, rot: [...I3] })
      }
  return { n, cubies }
}

export function cloneState(s: CubeState): CubeState {
  return { n: s.n, cubies: s.cubies.map((c) => ({ id: c.id, home: c.home, pos: [...c.pos] as Vec, rot: [...c.rot] })) }
}

export function layerOf(d: number, n: number): number {
  return (d + n - 1) / 2
}

export function applyMove(s: CubeState, m: Move): void {
  const R = rotationMatrix(m.axis, m.q)
  const set = new Set(m.layers)
  for (const c of s.cubies) {
    if (!set.has(layerOf(c.pos[m.axis], s.n))) continue
    c.pos = matVec(R, c.pos)
    c.rot = matMul(R, c.rot)
  }
}

export function applyMoves(s: CubeState, moves: Move[]): CubeState {
  for (const m of moves) applyMove(s, m)
  return s
}

// ------------------------------------------------------------------ notation

interface FaceDef {
  axis: Axis
  side: 1 | -1
  dir: 1 | -1
}
const FACE_DEF: Record<string, FaceDef> = {
  R: { axis: 0, side: 1, dir: -1 },
  L: { axis: 0, side: -1, dir: 1 },
  U: { axis: 1, side: 1, dir: -1 },
  D: { axis: 1, side: -1, dir: 1 },
  F: { axis: 2, side: 1, dir: -1 },
  B: { axis: 2, side: -1, dir: 1 },
}
const SLICE_DEF: Record<string, { axis: Axis; dir: 1 | -1 }> = {
  M: { axis: 0, dir: 1 },
  E: { axis: 1, dir: 1 },
  S: { axis: 2, dir: -1 },
}
const ROT_DEF: Record<string, Axis> = { x: 0, y: 1, z: 2 }

export interface Token {
  text: string
  move: Move
}

const TOKEN_RE = /(\d*)([URFDLBurfdlbMESxyz])(w?)(\d*)(['’`]?)/y

function range(a: number, b: number): number[] {
  const r: number[] = []
  for (let i = a; i <= b; i++) r.push(i)
  return r
}

function makeMove(prefix: string, letter: string, w: string, amt: string, prime: string, n: number): Move {
  const amount = amt ? parseInt(amt, 10) : 1
  const sign = prime ? -1 : 1
  const label = `${prefix}${letter}${w}${amount === 1 ? '' : amount}${prime ? "'" : ''}`
  if (letter in ROT_DEF) {
    return { axis: ROT_DEF[letter], layers: range(0, n - 1), q: -amount * sign, label }
  }
  if (letter in SLICE_DEF) {
    const d = SLICE_DEF[letter]
    const layers = n <= 2 ? [] : n % 2 === 1 && n > 3 ? [(n - 1) / 2] : range(1, n - 2)
    return { axis: d.axis, layers, q: d.dir * amount * sign, label }
  }
  const upper = letter.toUpperCase()
  const def = FACE_DEF[upper]
  const wide = w === 'w' || letter !== upper
  let layers: number[]
  if (wide) {
    const depth = Math.min(n, prefix ? parseInt(prefix, 10) : 2)
    layers = def.side > 0 ? range(n - depth, n - 1) : range(0, depth - 1)
  } else if (prefix) {
    const k = Math.min(n, parseInt(prefix, 10)) - 1
    layers = [def.side > 0 ? n - 1 - k : k]
  } else {
    layers = [def.side > 0 ? n - 1 : 0]
  }
  return { axis: def.axis, layers, q: def.dir * amount * sign, label }
}

/** Parse an algorithm string. Supports (groups)N repetition, wide (r, Rw, 3Rw), slices, rotations. */
export function parseAlg(alg: string, n = 3): Token[] {
  const out: Token[] = []
  const stack: Token[][] = [out]
  let i = 0
  const s = alg.replace(/[[\]]/g, (c) => (c === '[' ? '(' : ')'))
  while (i < s.length) {
    const ch = s[i]
    if (/\s|,|\./.test(ch)) {
      i++
      continue
    }
    if (ch === '(') {
      stack.push([])
      i++
      continue
    }
    if (ch === ')') {
      i++
      let rep = ''
      if (s[i] === 'x' && /\d/.test(s[i + 1] ?? '')) i++
      while (i < s.length && /\d/.test(s[i])) rep += s[i++]
      const group = stack.pop() ?? []
      const target = stack[stack.length - 1] ?? out
      const times = rep ? parseInt(rep, 10) : 1
      for (let t = 0; t < times; t++) target.push(...group)
      continue
    }
    TOKEN_RE.lastIndex = i
    const m = TOKEN_RE.exec(s)
    if (!m || m[0].length === 0) {
      i++
      continue
    }
    i += m[0].length
    const mv = makeMove(m[1], m[2], m[3], m[4], m[5], n)
    stack[stack.length - 1].push({ text: mv.label, move: mv })
  }
  while (stack.length > 1) {
    const g = stack.pop()!
    stack[stack.length - 1].push(...g)
  }
  return out
}

export function parseMoves(alg: string, n = 3): Move[] {
  return parseAlg(alg, n).map((t) => t.move)
}

export function invertLabel(label: string): string {
  if (label.endsWith("'")) return label.slice(0, -1)
  if (/2$/.test(label)) return label
  return label + "'"
}

export function invertMove(m: Move): Move {
  return { ...m, q: -m.q, label: invertLabel(m.label) }
}

export function invertAlg(alg: string, n = 3): string {
  return parseAlg(alg, n)
    .map((t) => invertLabel(t.text))
    .reverse()
    .join(' ')
}

export function algLength(alg: string): number {
  return parseAlg(alg).filter((t) => !/^[xyz]/.test(t.text)).length
}

export function stateFromAlg(n: number, alg: string): CubeState {
  return applyMoves(createCube(n), parseMoves(alg, n))
}

/** Generic move description for a dragged layer -> notation label. */
export function moveFromLayer(axis: Axis, layer: number, q: number, n: number): Move {
  const faces: [string, string][] = [
    ['R', 'L'],
    ['U', 'D'],
    ['F', 'B'],
  ]
  const [pos, neg] = faces[axis]
  const qn = ((q % 4) + 4) % 4
  let label: string
  if (n === 3 && layer === 1) {
    const slice = 'MES'[axis]
    const dir = SLICE_DEF[slice].dir
    label = slice + suffix(qn, dir)
  } else if (layer >= (n - 1) / 2) {
    const k = n - 1 - layer
    label = (k ? `${k + 1}` : '') + pos + suffix(qn, FACE_DEF[pos].dir)
  } else {
    label = (layer ? `${layer + 1}` : '') + neg + suffix(qn, FACE_DEF[neg].dir)
  }
  return { axis, layers: [layer], q, label }
}

function suffix(qn: number, dir: number): string {
  if (qn === 2) return '2'
  // qn = 1 means +90 about +axis
  const cw = qn === 1 ? dir === 1 : dir === -1
  return cw ? '' : "'"
}

// ------------------------------------------------------------------ stickers & inspection

export interface StickerInfo {
  cubie: number
  homeFace: Face
  face: Face
  pos: Vec
}

export function stickers(s: CubeState): StickerInfo[] {
  const out: StickerInfo[] = []
  const lim = s.n - 1
  for (const c of s.cubies) {
    for (let a = 0; a < 3; a++) {
      for (const sgn of [1, -1]) {
        if (c.home[a] !== sgn * lim) continue
        const hn: Vec = [0, 0, 0]
        hn[a] = sgn
        out.push({ cubie: c.id, homeFace: normalToFace(hn), face: normalToFace(matVec(c.rot, hn)), pos: c.pos })
      }
    }
  }
  return out
}

export function isSolved(s: CubeState): boolean {
  const seen: Partial<Record<Face, Face>> = {}
  for (const st of stickers(s)) {
    const prev = seen[st.face]
    if (prev === undefined) seen[st.face] = st.homeFace
    else if (prev !== st.homeFace) return false
  }
  return true
}

/** right / down unit vectors for the standard (Kociemba) facelet layout of each face */
export const FACE_GRID: Record<Face, { right: Vec; down: Vec }> = {
  U: { right: [1, 0, 0], down: [0, 0, 1] },
  R: { right: [0, 0, -1], down: [0, -1, 0] },
  F: { right: [1, 0, 0], down: [0, -1, 0] },
  D: { right: [1, 0, 0], down: [0, 0, -1] },
  L: { right: [0, 0, 1], down: [0, -1, 0] },
  B: { right: [-1, 0, 0], down: [0, -1, 0] },
}

function dot(a: Vec, b: Vec) {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
}

/** grid[row][col] = home face (colour key) of each sticker on a face */
export function faceGrid(s: CubeState, face: Face): Face[][] {
  const n = s.n
  const grid: Face[][] = Array.from({ length: n }, () => new Array<Face>(n).fill('U'))
  const { right, down } = FACE_GRID[face]
  for (const st of stickers(s)) {
    if (st.face !== face) continue
    const col = layerOf(dot(st.pos, right), n)
    const row = layerOf(dot(st.pos, down), n)
    grid[row][col] = st.homeFace
  }
  return grid
}

/** Kociemba facelet string (URFDLB order), letters named after the face each centre currently sits on. */
export function toFacelets(s: CubeState): string {
  if (s.n !== 3) throw new Error('3x3 only')
  const centreOf: Partial<Record<Face, Face>> = {}
  for (const f of FACES) centreOf[faceGrid(s, f)[1][1]] = f
  return FACES.map((f) =>
    faceGrid(s, f)
      .flat()
      .map((h) => centreOf[h])
      .join(''),
  ).join('')
}

// ------------------------------------------------------------------ scrambles

const SCR_FACES = ['U', 'D', 'R', 'L', 'F', 'B']
const AXIS_OF: Record<string, number> = { U: 1, D: 1, R: 0, L: 0, F: 2, B: 2 }

export function randomScramble(n = 3, length?: number): string {
  const len = length ?? (n === 2 ? 11 : n === 3 ? 21 : n === 4 ? 42 : 60)
  const faces = n === 2 ? ['U', 'R', 'F'] : SCR_FACES
  const out: string[] = []
  let lastAxis = -1
  let axisCount = 0
  while (out.length < len) {
    const f = faces[Math.floor(Math.random() * faces.length)]
    const ax = AXIS_OF[f]
    if (ax === lastAxis) {
      if (out[out.length - 1][0] === f || out[out.length - 1].replace(/^\d/, '')[0] === f) continue
      if (axisCount >= 2) continue
      axisCount++
    } else {
      lastAxis = ax
      axisCount = 1
    }
    const wide = n >= 4 && Math.random() < 0.35
    const deep = n >= 6 && wide && Math.random() < 0.4 ? '3' : ''
    const amt = ['', "'", '2'][Math.floor(Math.random() * 3)]
    out.push(wide ? `${deep}${f}w${amt}` : `${f}${amt}`)
  }
  return out.join(' ')
}

/** Random last-layer-only scramble for 3x3 (keeps F2L intact). */
export const LL_SCRAMBLES = [
  "R U R' U R U2 R' U F R U R' U' F'",
  "F R U R' U' F' U2 R U2 R' U' R U' R'",
  "R U2 R' U' R U' R' U' F R U R' U' F'",
  "r U R' U R U2 r' U2 R U R' U'",
]
