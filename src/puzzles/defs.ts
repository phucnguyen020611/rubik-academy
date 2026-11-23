/** Puzzle definitions for the twisty engine (no rendering here, so scripts can import them). */
import type { PieceDef, TurnDef, TwistyDef, Vec } from './twisty.ts'

const ALL = -99

/** Turns shared by every 3×3-mechanism puzzle (anchors on the −1/0/1 grid). */
function cube3Turns(): Record<string, TurnDef> {
  const face = (axis: Vec): TurnDef => ({ axis, order: 4, min: 0.5 })
  const slice = (axis: Vec): TurnDef => ({ axis, order: 4, min: -0.5, max: 0.5 })
  const whole = (axis: Vec): TurnDef => ({ axis, order: 4, min: ALL })
  return {
    R: face([1, 0, 0]),
    L: face([-1, 0, 0]),
    U: face([0, 1, 0]),
    D: face([0, -1, 0]),
    F: face([0, 0, 1]),
    B: face([0, 0, -1]),
    M: slice([-1, 0, 0]),
    E: slice([0, -1, 0]),
    S: slice([0, 0, 1]),
    x: whole([1, 0, 0]),
    y: whole([0, 1, 0]),
    z: whole([0, 0, 1]),
  }
}

function cube3Pieces(): PieceDef[] {
  const pieces: PieceDef[] = []
  for (let x = -1; x <= 1; x++)
    for (let y = -1; y <= 1; y++)
      for (let z = -1; z <= 1; z++) {
        if (!x && !y && !z) continue
        const faces: Vec[] = []
        if (x) faces.push([x, 0, 0])
        if (y) faces.push([0, y, 0])
        if (z) faces.push([0, 0, z])
        pieces.push({ anchor: [x, y, z], faces })
      }
  return pieces
}

/** Mirror blocks: a normal 3×3 inside, with layers of different thickness outside. */
export const MIRROR: TwistyDef = {
  id: 'mirror',
  pieces: cube3Pieces(),
  turns: cube3Turns(),
  scrambleTurns: ['R', 'L', 'U', 'D', 'F', 'B'],
  scrambleLength: 22,
}

/**
 * Where the outer faces of the mirror cube sit along each axis (mechanism cuts are at ±0.5).
 * Every axis spans 2.9 units, so the solved puzzle is a cube.
 */
export const MIRROR_BOUNDS: [number, number][] = [
  [-1.62, 1.28],
  [-1.2, 1.7],
  [-1.4, 1.5],
]

// ------------------------------------------------------------------ pyraminx
const r3 = Math.sqrt
/** unit vectors from the centre to the four vertices; U on top, L/R at the front, B at the back */
export const PYRA_VERTS: Record<'U' | 'L' | 'R' | 'B', Vec> = {
  U: [0, 1, 0],
  L: [-r3(6) / 3, -1 / 3, r3(2) / 3],
  R: [r3(6) / 3, -1 / 3, r3(2) / 3],
  B: [0, -1 / 3, (-2 * r3(2)) / 3],
}
export type PyraVertex = keyof typeof PYRA_VERTS
export const PYRA_ORDER: PyraVertex[] = ['U', 'L', 'R', 'B']
export const PYRA_EDGES: [PyraVertex, PyraVertex][] = [
  ['U', 'L'],
  ['U', 'R'],
  ['U', 'B'],
  ['L', 'R'],
  ['L', 'B'],
  ['R', 'B'],
]
const scale = (v: Vec, k: number): Vec => [v[0] * k, v[1] * k, v[2] * k]
const neg = (v: Vec): Vec => [-v[0], -v[1], -v[2]]
const others = (...vs: PyraVertex[]) => PYRA_ORDER.filter((x) => !vs.includes(x))

/** piece order: 4 tips, 4 axial centres, 6 edges */
export const PYRAMINX: TwistyDef = {
  id: 'pyraminx',
  pieces: [
    ...PYRA_ORDER.map((v) => ({ anchor: scale(PYRA_VERTS[v], 0.8), faces: others(v).map((o) => neg(PYRA_VERTS[o])) })),
    ...PYRA_ORDER.map((v) => ({ anchor: scale(PYRA_VERTS[v], 0.4), faces: others(v).map((o) => neg(PYRA_VERTS[o])) })),
    ...PYRA_EDGES.map(([a, b]) => ({
      anchor: scale(PYRA_VERTS[a].map((x, i) => x + PYRA_VERTS[b][i]) as Vec, 0.5),
      faces: others(a, b).map((o) => neg(PYRA_VERTS[o])),
    })),
  ],
  // cuts sit at 1/3 and 2/3 of the way down from each vertex: heights 5/9 and 1/9
  turns: Object.fromEntries(
    PYRA_ORDER.flatMap((v) => [
      [v, { axis: PYRA_VERTS[v], order: 3, min: 1 / 9 }],
      [v.toLowerCase(), { axis: PYRA_VERTS[v], order: 3, min: 5 / 9 }],
    ]),
  ),
  scrambleTurns: ['U', 'L', 'R', 'B'],
  scrambleLength: 11,
  scrambleTips: ['u', 'l', 'r', 'b'],
}

// ------------------------------------------------------------------ skewb
/** corner turns: the four named in competition notation, plus the other four for dragging */
export const SKEWB_CORNERS: Record<string, Vec> = {
  R: [1, -1, -1],
  U: [-1, 1, -1],
  L: [-1, -1, 1],
  B: [-1, -1, -1],
  UFR: [1, 1, 1],
  UFL: [-1, 1, 1],
  UBR: [1, 1, -1],
  DFR: [1, -1, 1],
}

export const SKEWB: TwistyDef = {
  id: 'skewb',
  pieces: [
    ...[-1, 1].flatMap((x) => [-1, 1].flatMap((y) => [-1, 1].map((z) => ({ anchor: [x, y, z] as Vec, faces: [[x, 0, 0], [0, y, 0], [0, 0, z]] as Vec[] })))),
    ...([[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]] as Vec[]).map((n) => ({ anchor: n, faces: [n] })),
  ],
  turns: {
    ...Object.fromEntries(Object.entries(SKEWB_CORNERS).map(([k, axis]) => [k, { axis, order: 3, min: 0 }])),
    x: { axis: [1, 0, 0], order: 4, min: ALL },
    y: { axis: [0, 1, 0], order: 4, min: ALL },
    z: { axis: [0, 0, 1], order: 4, min: ALL },
  },
  scrambleTurns: ['R', 'U', 'L', 'B'],
  scrambleLength: 11,
}

export const TWISTY_DEFS: Record<string, TwistyDef> = {
  mirror: MIRROR,
  pyraminx: PYRAMINX,
  skewb: SKEWB,
}
