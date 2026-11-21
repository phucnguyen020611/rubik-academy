/**
 * Colour reading, classification and validity checks for scanning a real 3×3.
 * Pure functions: no DOM, so they can be tested in node.
 *
 * Facelet order follows the solver: faces U R F D L B, 9 stickers each, row by row
 * (see FACE_GRID in engine.ts for how each face is viewed).
 */

export type Lab = [number, number, number]
export const FACE_ORDER = ['U', 'R', 'F', 'D', 'L', 'B'] as const
export type FaceLetter = (typeof FACE_ORDER)[number]

// ------------------------------------------------------------------ colour maths (OKLab)
const toLinear = (c: number) => {
  const v = c / 255
  return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)
}

export function rgbToOklab(r: number, g: number, b: number): Lab {
  const R = toLinear(r)
  const G = toLinear(g)
  const B = toLinear(b)
  const l = Math.cbrt(0.4122214708 * R + 0.5363325363 * G + 0.0514459929 * B)
  const m = Math.cbrt(0.2119034982 * R + 0.6806995451 * G + 0.1073969566 * B)
  const s = Math.cbrt(0.0883024619 * R + 0.2817188376 * G + 0.6299787005 * B)
  return [0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s, 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s, 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s]
}

export function hexToOklab(hex: string): Lab {
  const n = parseInt(hex.slice(1), 16)
  return rgbToOklab((n >> 16) & 255, (n >> 8) & 255, n & 255)
}

export const chroma = (c: Lab) => Math.hypot(c[1], c[2])

/** Lightness matters less than hue: lighting changes L far more than a/b. */
export function colourDistance(p: Lab, q: Lab) {
  return Math.hypot((p[0] - q[0]) * 0.55, p[1] - q[1], p[2] - q[2])
}

const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b)
  return s[Math.floor(s.length / 2)]
}

/**
 * Robust colour of one sticker from raw RGBA pixels: drops glare and dark pixels
 * (plastic body, shadows), then takes the per-channel median.
 */
export function stickerColour(pixels: ArrayLike<number>, idx: number[]): Lab | null {
  const labs: Lab[] = []
  for (const i of idx) labs.push(rgbToOklab(pixels[i], pixels[i + 1], pixels[i + 2]))
  if (!labs.length) return null
  const keep = labs.filter((c) => c[0] > 0.18 && !(c[0] > 0.96 && chroma(c) < 0.025))
  const use = keep.length >= labs.length * 0.25 ? keep : labs
  return [median(use.map((c) => c[0])), median(use.map((c) => c[1])), median(use.map((c) => c[2]))]
}

// ------------------------------------------------------------------ assignment (Hungarian)
/** Minimum-cost perfect assignment for a square cost matrix. Returns col index for each row. */
export function hungarian(cost: number[][]): number[] {
  const n = cost.length
  const u = new Array(n + 1).fill(0)
  const v = new Array(n + 1).fill(0)
  const p = new Array(n + 1).fill(0)
  const way = new Array(n + 1).fill(0)
  for (let i = 1; i <= n; i++) {
    p[0] = i
    let j0 = 0
    const minv = new Array(n + 1).fill(Infinity)
    const used = new Array(n + 1).fill(false)
    do {
      used[j0] = true
      const i0 = p[j0]
      let delta = Infinity
      let j1 = 0
      for (let j = 1; j <= n; j++) {
        if (used[j]) continue
        const cur = cost[i0 - 1][j - 1] - u[i0] - v[j]
        if (cur < minv[j]) {
          minv[j] = cur
          way[j] = j0
        }
        if (minv[j] < delta) {
          delta = minv[j]
          j1 = j
        }
      }
      for (let j = 0; j <= n; j++) {
        if (used[j]) {
          u[p[j]] += delta
          v[j] -= delta
        } else minv[j] -= delta
      }
      j0 = j1
    } while (p[j0] !== 0)
    do {
      const j1 = way[j0]
      p[j0] = p[j1]
      j0 = j1
    } while (j0)
  }
  const ans = new Array(n).fill(-1)
  for (let j = 1; j <= n; j++) if (p[j]) ans[p[j] - 1] = j - 1
  return ans
}

// ------------------------------------------------------------------ classification
export interface Classified {
  /** cluster (0..5) of every sticker; cluster k is seeded by the centre of face k */
  cluster: number[]
  /** 0..1, low means "double-check this sticker" */
  confidence: number[]
  means: Lab[]
}

/**
 * Split 54 measured colours into 6 groups of exactly 9, seeded by the six centres.
 * The "exactly 9" rule is what fixes most red/orange and white/yellow mix-ups.
 */
export function classify(colours: Lab[]): Classified {
  if (colours.length !== 54) throw new Error('need 54 colours')
  let means: Lab[] = FACE_ORDER.map((_, f) => colours[f * 9 + 4])
  let cluster = new Array(54).fill(0)
  for (let iter = 0; iter < 4; iter++) {
    // 54×54 cost matrix: column c belongs to cluster floor(c / 9)
    const cost = colours.map((col, i) =>
      Array.from({ length: 54 }, (_, c) => {
        const k = Math.floor(c / 9)
        if (i % 9 === 4) return Math.floor(i / 9) === k ? 0 : 1e6 // centres stay put
        return colourDistance(col, means[k])
      }),
    )
    const asg = hungarian(cost)
    cluster = asg.map((c) => Math.floor(c / 9))
    means = means.map((_, k) => {
      const members = colours.filter((_, i) => cluster[i] === k)
      return [0, 1, 2].map((d) => median(members.map((m) => m[d]))) as Lab
    })
  }
  const confidence = colours.map((col, i) => {
    const own = colourDistance(col, means[cluster[i]])
    const other = Math.min(...means.map((m, k) => (k === cluster[i] ? Infinity : colourDistance(col, m))))
    return Math.max(0, Math.min(1, (other - own) / (other + 1e-6)))
  })
  return { cluster, confidence, means }
}

/** Match the six cluster means to the six palette colours (for display). */
export function matchPalette(means: Lab[], palette: Lab[]): number[] {
  return hungarian(means.map((m) => palette.map((p) => colourDistance(m, p))))
}

// ------------------------------------------------------------------ validity
const C = [
  [8, 9, 20],
  [6, 18, 38],
  [0, 36, 47],
  [2, 45, 11],
  [29, 26, 15],
  [27, 44, 24],
  [33, 53, 42],
  [35, 17, 51],
]
const CC = ['URF', 'UFL', 'ULB', 'UBR', 'DFR', 'DLF', 'DBL', 'DRB']
const E = [
  [5, 10],
  [7, 19],
  [3, 37],
  [1, 46],
  [32, 16],
  [28, 25],
  [30, 43],
  [34, 52],
  [23, 12],
  [21, 41],
  [50, 39],
  [48, 14],
]
const EC = ['UR', 'UF', 'UL', 'UB', 'DR', 'DF', 'DL', 'DB', 'FR', 'FL', 'BL', 'BR']

export type ScanError =
  | { kind: 'count'; letter: string; count: number }
  | { kind: 'centres' }
  | { kind: 'corner'; at: number[] }
  | { kind: 'edge'; at: number[] }
  | { kind: 'twist' }
  | { kind: 'flip' }
  | { kind: 'parity' }

const parity = (perm: number[]) => {
  let s = 0
  for (let i = 0; i < perm.length; i++) for (let j = i + 1; j < perm.length; j++) if (perm[i] > perm[j]) s++
  return s % 2
}

/** Checks a 54-letter facelet string; returns null when it is a solvable cube. */
export function validateFacelets(f: string): ScanError | null {
  if (f.length !== 54) return { kind: 'centres' }
  for (const l of FACE_ORDER) {
    const count = [...f].filter((x) => x === l).length
    if (count !== 9) return { kind: 'count', letter: l, count }
  }
  if (new Set(FACE_ORDER.map((_, k) => f[k * 9 + 4])).size !== 6) return { kind: 'centres' }

  const cPerm: number[] = []
  let twist = 0
  for (const pos of C) {
    const cols = pos.map((i) => f[i])
    const ori = cols.findIndex((x) => x === 'U' || x === 'D')
    if (ori < 0) return { kind: 'corner', at: pos }
    const a = cols[(ori + 1) % 3]
    const b = cols[(ori + 2) % 3]
    const j = CC.findIndex((cc) => cc[0] === cols[ori] && cc[1] === a && cc[2] === b)
    if (j < 0 || cPerm.includes(j)) return { kind: 'corner', at: pos }
    cPerm.push(j)
    twist += ori
  }
  const ePerm: number[] = []
  let flip = 0
  for (const pos of E) {
    const a = f[pos[0]]
    const b = f[pos[1]]
    let j = EC.findIndex((ec) => ec[0] === a && ec[1] === b)
    let o = 0
    if (j < 0) {
      j = EC.findIndex((ec) => ec[0] === b && ec[1] === a)
      o = 1
    }
    if (j < 0 || ePerm.includes(j)) return { kind: 'edge', at: pos }
    ePerm.push(j)
    flip += o
  }
  if (twist % 3) return { kind: 'twist' }
  if (flip % 2) return { kind: 'flip' }
  if (parity(cPerm) !== parity(ePerm)) return { kind: 'parity' }
  return null
}

/** Sticker colours (palette index per sticker) → facelet letters via the centres. */
export function toFaceletString(colours: (number | null)[]): string | null {
  const letterOf = new Map<number, string>()
  for (let k = 0; k < 6; k++) {
    const c = colours[k * 9 + 4]
    if (c === null || letterOf.has(c)) return null
    letterOf.set(c, FACE_ORDER[k])
  }
  let out = ''
  for (const c of colours) {
    if (c === null || !letterOf.has(c)) return null
    out += letterOf.get(c)
  }
  return out
}
