/** Puzzle definitions for the twisty engine (no rendering here, so scripts can import them). */
import { Quaternion, Vector3 } from 'three'
import type { PieceDef, TurnDef, TwistyDef, TwistyMove, Vec } from './twisty.ts'

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

// ------------------------------------------------------------------ megaminx
const PHI = (1 + Math.sqrt(5)) / 2

/** face names: top, upper ring (front first, clockwise from above), lower ring, bottom */
export const MEGA_FACE_NAMES = ['U', 'F', 'R', 'BR', 'BL', 'L', 'DR', 'DBR', 'B', 'DBL', 'DL', 'D'] as const
export type MegaFace = (typeof MEGA_FACE_NAMES)[number]

/** Dodecahedron (circumradius 1) turned so one face is on top and another faces the viewer. */
export const MEGA = (() => {
  const verts: Vector3[] = []
  for (const x of [-1, 1]) for (const y of [-1, 1]) for (const z of [-1, 1]) verts.push(new Vector3(x, y, z))
  for (const a of [-1, 1])
    for (const b of [-1, 1]) verts.push(new Vector3(0, a / PHI, b * PHI), new Vector3(a / PHI, b * PHI, 0), new Vector3(a * PHI, 0, b / PHI))
  const normals: Vector3[] = []
  for (const a of [-1, 1]) for (const b of [-1, 1]) normals.push(new Vector3(a, 0, b * PHI), new Vector3(0, a * PHI, b), new Vector3(a * PHI, b, 0))
  verts.forEach((v) => v.normalize())
  normals.forEach((n) => n.normalize())
  // put normals[k] on top, then spin about y so the most forward upper face looks straight at +z
  const up = normals.find((n) => n.y > 0.8 && n.z > 0)!
  const q = new Quaternion().setFromUnitVectors(up, new Vector3(0, 1, 0))
  const rotate = (v: Vector3) => v.applyQuaternion(q)
  verts.forEach(rotate)
  normals.forEach(rotate)
  const front = normals.filter((n) => n.y > 0.2 && n.y < 0.8).sort((a, b) => b.z - a.z)[0]
  const spin = new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), -Math.atan2(front.x, front.z))
  verts.forEach((v) => v.applyQuaternion(spin))
  normals.forEach((n) => n.applyQuaternion(spin))
  // name the faces: top, upper ring by azimuth (front, then clockwise seen from above), lower ring, bottom
  const az = (n: Vector3) => {
    const a = Math.atan2(n.x, n.z)
    return a < -1e-6 ? a + Math.PI * 2 : a
  }
  const top = normals.find((n) => n.y > 0.99)!
  const bottom = normals.find((n) => n.y < -0.99)!
  const upper = normals.filter((n) => n.y > 0.2 && n.y < 0.99).sort((a, b) => az(a) - az(b))
  const lower = normals.filter((n) => n.y < -0.2 && n.y > -0.99).sort((a, b) => az(a) - az(b))
  // upper ring: F (az 0), R, BR, BL, L going clockwise from above = increasing azimuth towards +x
  const faceN: Record<MegaFace, Vector3> = {
    U: top,
    F: upper[0],
    R: upper[1],
    BR: upper[2],
    BL: upper[3],
    L: upper[4],
    DR: lower[0],
    DBR: lower[1],
    B: lower[2],
    DBL: lower[3],
    DL: lower[4],
    D: bottom,
  }
  const inradius = verts.reduce((m, v) => Math.max(m, v.dot(top)), 0)
  // each face's five corners, in order around the face
  const faceVerts = {} as Record<MegaFace, number[]>
  for (const f of MEGA_FACE_NAMES) {
    const n = faceN[f]
    const idx = verts.map((v, i) => [v.dot(n), i] as const).sort((a, b) => b[0] - a[0]).slice(0, 5).map(([, i]) => i)
    const c = n.clone().multiplyScalar(inradius)
    const u = verts[idx[0]].clone().sub(c).normalize()
    const w = n.clone().cross(u)
    idx.sort((a, b) => Math.atan2(verts[a].clone().sub(c).dot(w), verts[a].clone().sub(c).dot(u)) - Math.atan2(verts[b].clone().sub(c).dot(w), verts[b].clone().sub(c).dot(u)))
    faceVerts[f] = idx
  }
  const edgeKey = (a: number, b: number) => (a < b ? `${a}-${b}` : `${b}-${a}`)
  const edges: [number, number][] = []
  const seen = new Set<string>()
  for (const f of MEGA_FACE_NAMES) {
    const vs = faceVerts[f]
    vs.forEach((a, i) => {
      const b = vs[(i + 1) % 5]
      if (!seen.has(edgeKey(a, b))) {
        seen.add(edgeKey(a, b))
        edges.push([a, b])
      }
    })
  }
  const facesOfVert = (i: number) => MEGA_FACE_NAMES.filter((f) => faceVerts[f].includes(i))
  return { verts, faceN, faceVerts, edges, edgeKey, inradius, facesOfVert }
})()

const tv = (v: Vector3): Vec => [v.x, v.y, v.z]

/** piece order: 12 centres (face order), 20 corners (vertex order), 30 edges */
export const MEGAMINX: TwistyDef = (() => {
  const { verts, faceN, edges, inradius, facesOfVert } = MEGA
  const pieces: PieceDef[] = [
    ...MEGA_FACE_NAMES.map((f) => ({ anchor: tv(faceN[f].clone().multiplyScalar(inradius)), faces: [tv(faceN[f])] })),
    ...verts.map((v, i) => ({ anchor: tv(v), faces: facesOfVert(i).map((f) => tv(faceN[f])) })),
    ...edges.map(([a, b]) => ({
      anchor: tv(verts[a].clone().add(verts[b]).multiplyScalar(0.5)),
      faces: facesOfVert(a)
        .filter((f) => facesOfVert(b).includes(f))
        .map((f) => tv(faceN[f])),
    })),
  ]
  const layer = inradius * 0.9
  const turns: Record<string, TurnDef> = Object.fromEntries(MEGA_FACE_NAMES.map((f) => [f, { axis: tv(faceN[f]), order: 5, min: layer }]))
  // competition scrambles turn everything except one face: R++ keeps DBL still, D++ keeps U still
  turns.Rw = { axis: tv(faceN.R), order: 5, min: -layer, wideLabel: 'R' }
  turns.Dw = { axis: tv(faceN.D), order: 5, min: -layer, wideLabel: 'D' }
  return {
    id: 'megaminx',
    pieces,
    turns,
    scrambleTurns: [...MEGA_FACE_NAMES],
    scrambleLength: 70,
    tokens: {
      'R++': { turn: 'Rw', amount: 2 },
      'R--': { turn: 'Rw', amount: -2 },
      'D++': { turn: 'Dw', amount: 2 },
      'D--': { turn: 'Dw', amount: -2 },
    },
    // 7 lines of ten R±± / D±± moves, each line ending in U or U'
    scramble: (rnd) => {
      const out: TwistyMove[] = []
      for (let line = 0; line < 7; line++) {
        for (let i = 0; i < 10; i++) out.push({ turn: i % 2 ? 'Dw' : 'Rw', amount: rnd() < 0.5 ? 2 : -2 })
        out.push({ turn: 'U', amount: rnd() < 0.5 ? 1 : -1 })
      }
      return out
    },
  }
})()

export const TWISTY_DEFS: Record<string, TwistyDef> = {
  mirror: MIRROR,
  pyraminx: PYRAMINX,
  skewb: SKEWB,
  megaminx: MEGAMINX,
}
