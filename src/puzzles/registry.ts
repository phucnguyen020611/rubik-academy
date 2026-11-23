/** Everything the play page needs to know about each non-cube puzzle. */
import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import { L, type Tx } from '../i18n-core'
import { COLORS } from '../cube/schemes'
import { MEGA, MEGAMINX, MEGA_FACE_NAMES, MIRROR, MIRROR_BOUNDS, PYRAMINX, PYRA_EDGES, PYRA_ORDER, PYRA_VERTS, SKEWB, type MegaFace, type PyraVertex } from './defs'
import { bodyGeometry, pieceMaterials, pieceObject, stickerGeometry, type Poly } from './geometry'
import type { TwistyDef } from './twisty'

export interface PuzzleEntry {
  id: string
  name: Tx
  blurb: Tx
  def: TwistyDef
  /** one Object3D per piece, modelled in puzzle space (mechanism centre at the origin) */
  build: (i: number) => THREE.Object3D
  /** visual centre of the solved puzzle, so it sits in the middle of the stage */
  centre: THREE.Vector3
  /** rough width of the puzzle, used to frame the camera */
  size: number
  /** move-pad rows (turn names) */
  pad: string[][]
  /** keyboard key → turn name */
  keys: Record<string, string>
  /** small hint shown under the stage */
  keyHint: Tx
  /** static inner body that never turns */
  core?: () => THREE.Object3D
}

// ------------------------------------------------------------------ mirror blocks
let mirrorMats: { body: THREE.Material; plate: THREE.Material } | null = null
const mats = () =>
  (mirrorMats ??= {
    body: new THREE.MeshStandardMaterial({ color: '#141516', roughness: 0.4 }),
    plate: new THREE.MeshStandardMaterial({ color: '#e9c46a', metalness: 0.65, roughness: 0.22, emissive: '#3a2a08', emissiveIntensity: 0.35 }),
  })

function buildMirrorPiece(i: number) {
  const [ax, ay, az] = MIRROR.pieces[i].anchor
  const span = (axis: number, a: number): [number, number] => (a < 0 ? [MIRROR_BOUNDS[axis][0], -0.5] : a > 0 ? [0.5, MIRROR_BOUNDS[axis][1]] : [-0.5, 0.5])
  const [[x0, x1], [y0, y1], [z0, z1]] = [span(0, ax), span(1, ay), span(2, az)]
  const gap = 0.035
  const w = x1 - x0 - gap
  const h = y1 - y0 - gap
  const d = z1 - z0 - gap
  const c = new THREE.Vector3((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2)
  const g = new THREE.Group()
  const body = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 2, 0.06), mats().body)
  body.position.copy(c)
  g.add(body)
  // mirror-finish plate on every outer face
  const inset = 0.13
  for (const f of MIRROR.pieces[i].faces) {
    const n = new THREE.Vector3(...f)
    const dims = n.x ? [d, h] : n.y ? [w, d] : [w, h]
    const plate = new THREE.Mesh(new THREE.PlaneGeometry(Math.max(0.1, dims[0] - inset), Math.max(0.1, dims[1] - inset)), mats().plate)
    plate.position.copy(c).addScaledVector(n, (n.x ? w : n.y ? h : d) / 2 + 0.003)
    plate.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), n)
    g.add(plate)
  }
  return g
}

// ------------------------------------------------------------------ pyraminx
const PYRA_R = 1.75
const PYRA_COLOURS: Record<PyraVertex, string> = { B: COLORS.green, L: COLORS.blue, R: COLORS.red, U: COLORS.yellow }

/** stickers of every piece, worked out once: each face is cut into 9 small triangles */
const pyraPolys = (() => {
  const byPiece: Poly[][] = PYRAMINX.pieces.map(() => [])
  const V = (k: PyraVertex) => new THREE.Vector3(...PYRA_VERTS[k]).multiplyScalar(PYRA_R)
  const tip = (k: PyraVertex) => PYRA_ORDER.indexOf(k)
  const axial = (k: PyraVertex) => 4 + PYRA_ORDER.indexOf(k)
  const edge = (a: PyraVertex, b: PyraVertex) => 8 + PYRA_EDGES.findIndex(([x, y]) => (x === a && y === b) || (x === b && y === a))
  for (const opp of PYRA_ORDER) {
    const [k0, k1, k2] = PYRA_ORDER.filter((k) => k !== opp)
    const [a, b, c] = [V(k0), V(k1), V(k2)]
    const P = (i: number, j: number) => a.clone().addScaledVector(b.clone().sub(a), i / 3).addScaledVector(c.clone().sub(a), j / 3)
    const color = PYRA_COLOURS[opp]
    const put = (piece: number, pts: THREE.Vector3[]) => byPiece[piece].push({ pts, color })
    put(tip(k0), [P(0, 0), P(1, 0), P(0, 1)])
    put(tip(k1), [P(2, 0), P(3, 0), P(2, 1)])
    put(tip(k2), [P(0, 2), P(1, 2), P(0, 3)])
    put(axial(k0), [P(1, 0), P(1, 1), P(0, 1)])
    put(axial(k1), [P(2, 0), P(2, 1), P(1, 1)])
    put(axial(k2), [P(1, 1), P(1, 2), P(0, 2)])
    put(edge(k0, k1), [P(1, 0), P(2, 0), P(1, 1)])
    put(edge(k0, k2), [P(0, 1), P(1, 1), P(0, 2)])
    put(edge(k1, k2), [P(1, 1), P(2, 1), P(1, 2)])
  }
  return byPiece
})()

const ORIGIN = new THREE.Vector3()

function buildPyraPiece(i: number) {
  const polys = pyraPolys[i]
  return pieceObject(stickerGeometry(polys, ORIGIN, 0.8, 0.012), bodyGeometry(polys, ORIGIN, 0.32))
}

/** solid black tetrahedron behind the pieces, so seams and turning layers never show daylight */
function pyraCore() {
  const v = PYRA_ORDER.map((k) => new THREE.Vector3(...PYRA_VERTS[k]).multiplyScalar(PYRA_R * 0.8))
  const polys: Poly[] = PYRA_ORDER.map((_k, oi) => ({ pts: v.filter((_, i) => i !== oi), color: '#000' }))
  const g = bodyGeometry(polys, ORIGIN, 1, 1)
  return new THREE.Mesh(g, pieceMaterials().body)
}

// ------------------------------------------------------------------ skewb
const SKEWB_H = 1.45

const skewbPolys = (() => {
  const byPiece: Poly[][] = SKEWB.pieces.map(() => [])
  const faces: [THREE.Vector3, THREE.Vector3, THREE.Vector3, string][] = [
    [new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 0, -1), new THREE.Vector3(0, -1, 0), COLORS.red],
    [new THREE.Vector3(-1, 0, 0), new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, -1, 0), COLORS.orange],
    [new THREE.Vector3(0, 1, 0), new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 0, 1), COLORS.white],
    [new THREE.Vector3(0, -1, 0), new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 0, -1), COLORS.yellow],
    [new THREE.Vector3(0, 0, 1), new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, -1, 0), COLORS.green],
    [new THREE.Vector3(0, 0, -1), new THREE.Vector3(-1, 0, 0), new THREE.Vector3(0, -1, 0), COLORS.blue],
  ]
  faces.forEach(([n, r, d, color], fi) => {
    const at = (a: number, b: number) => n.clone().addScaledVector(r, a).addScaledVector(d, b).multiplyScalar(SKEWB_H)
    const mids = [at(0, -1), at(1, 0), at(0, 1), at(-1, 0)]
    byPiece[8 + fi].push({ pts: mids, color })
    const corners = [at(1, -1), at(1, 1), at(-1, 1), at(-1, -1)]
    corners.forEach((c, i) => {
      const idx = (c.x > 0 ? 4 : 0) + (c.y > 0 ? 2 : 0) + (c.z > 0 ? 1 : 0)
      byPiece[idx].push({ pts: [c, mids[(i + 1) % 4], mids[i]], color })
    })
  })
  return byPiece
})()

function buildSkewbPiece(i: number) {
  const polys = skewbPolys[i]
  return pieceObject(stickerGeometry(polys, ORIGIN, 0.82, 0.012), bodyGeometry(polys, ORIGIN, 1, 0.985))
}

// ------------------------------------------------------------------ megaminx
const MEGA_R = 1.7
const MEGA_COLOURS: Record<MegaFace, string> = {
  U: '#f5f6f1',
  F: '#00a35c',
  R: '#d7263d',
  BR: '#0a5bd6',
  BL: '#ffd60a',
  L: '#7b3fa0',
  DR: '#ff8fb8',
  DBR: '#86d24a',
  B: '#ff7a00',
  DBL: '#5ec8f2',
  DL: '#fff1a8',
  D: '#a9a39a',
}

/** each face is a centre pentagon, five edge trapezoids and five corner quads */
const megaPolys = (() => {
  const { verts, faceN, faceVerts, edges, edgeKey, inradius } = MEGA
  const edgeIndex = new Map(edges.map(([a, b], i) => [edgeKey(a, b), i]))
  const byPiece: Poly[][] = MEGAMINX.pieces.map(() => [])
  const S = 0.46
  // where the line through q (direction d) crosses the segment a→b
  const hit = (q: THREE.Vector3, d: THREE.Vector3, a: THREE.Vector3, b: THREE.Vector3) => {
    const e = b.clone().sub(a)
    const aq = a.clone().sub(q)
    const dd = d.dot(d)
    const de = d.dot(e)
    const ee = e.dot(e)
    return a.clone().addScaledVector(e, (dd * e.dot(aq) - de * d.dot(aq)) / (de * de - dd * ee))
  }
  MEGA_FACE_NAMES.forEach((f, fi) => {
    const color = MEGA_COLOURS[f]
    const ids = faceVerts[f]
    const V = ids.map((i) => verts[i].clone().multiplyScalar(MEGA_R))
    const C = faceN[f].clone().multiplyScalar(inradius * MEGA_R)
    const Q = V.map((p) => C.clone().lerp(p, S))
    byPiece[fi].push({ pts: Q, color })
    for (let i = 0; i < 5; i++) {
      const prev = (i + 4) % 5
      const next = (i + 1) % 5
      const X = hit(Q[i], V[i].clone().sub(V[prev]), V[i], V[next])
      const Y = hit(Q[i], V[next].clone().sub(V[i]), V[prev], V[i])
      byPiece[12 + ids[i]].push({ pts: [V[i], X, Q[i], Y], color })
      const X2 = hit(Q[next], V[(i + 2) % 5].clone().sub(V[next]), V[i], V[next])
      byPiece[32 + edgeIndex.get(edgeKey(ids[i], ids[next]))!].push({ pts: [X, X2, Q[next], Q[i]], color })
    }
  })
  return byPiece
})()

function buildMegaPiece(i: number) {
  const polys = megaPolys[i]
  return pieceObject(stickerGeometry(polys, ORIGIN, 0.86, 0.01), bodyGeometry(polys, ORIGIN, 0.3))
}

function megaCore() {
  const { verts, faceVerts } = MEGA
  const polys: Poly[] = MEGA_FACE_NAMES.map((f) => ({ pts: faceVerts[f].map((i) => verts[i].clone().multiplyScalar(MEGA_R * 0.86)), color: '#000' }))
  return new THREE.Mesh(bodyGeometry(polys, ORIGIN, 1, 1), pieceMaterials().body)
}

const boundsCentre = new THREE.Vector3(...MIRROR_BOUNDS.map(([a, b]) => (a + b) / 2) as [number, number, number])

const CUBE_KEYS: Record<string, string> = { r: 'R', l: 'L', u: 'U', d: 'D', f: 'F', b: 'B', m: 'M', e: 'E', s: 'S', x: 'x', y: 'y', z: 'z' }

export const PUZZLES: Record<string, PuzzleEntry> = {
  mirror: {
    id: 'mirror',
    name: L('Mirror cube', 'Mirror cube'),
    blurb: L('Bên trong là 3×3 bình thường, nhưng các lớp dày mỏng khác nhau nên phải giải theo hình dạng thay vì màu.', 'A normal 3×3 inside, but every layer has a different thickness, so you solve it by shape instead of colour.'),
    def: MIRROR,
    build: buildMirrorPiece,
    centre: boundsCentre,
    size: 3.2,
    pad: [
      ['U', 'D', 'R', 'L', 'F', 'B'],
      ['M', 'E', 'S', 'x', 'y', 'z'],
    ],
    keys: CUBE_KEYS,
    keyHint: L('Phím U R F D L B, Shift = ngược', 'Keys U R F D L B, Shift = prime'),
  },
  pyraminx: {
    id: 'pyraminx',
    name: L('Pyraminx', 'Pyraminx'),
    blurb: L('Kim tự tháp bốn mặt. Bốn đỉnh nhỏ xoay riêng được nên thường để giải sau cùng.', 'A four-sided pyramid. The four small tips turn on their own, so most people fix them last.'),
    def: PYRAMINX,
    build: buildPyraPiece,
    core: pyraCore,
    centre: new THREE.Vector3(0, PYRA_R / 3, 0),
    size: 2.6,
    pad: [
      ['U', 'L', 'R', 'B'],
      ['u', 'l', 'r', 'b'],
    ],
    keys: { u: 'U', l: 'L', r: 'R', b: 'B', '1': 'u', '2': 'l', '3': 'r', '4': 'b' },
    keyHint: L('Phím U L R B, số 1–4 cho đỉnh, Shift = ngược', 'Keys U L R B, 1–4 for tips, Shift = prime'),
  },
  skewb: {
    id: 'skewb',
    name: L('Skewb', 'Skewb'),
    blurb: L('Trông như khối vuông nhưng mỗi lần xoay là cả nửa khối quanh một góc. Chỉ có 8 góc và 6 tâm.', 'Looks like a cube, but every turn moves half the puzzle around a corner. Just 8 corners and 6 centres.'),
    def: SKEWB,
    build: buildSkewbPiece,
    centre: new THREE.Vector3(),
    size: 3.2,
    pad: [
      ['R', 'U', 'L', 'B'],
      ['x', 'y', 'z'],
    ],
    keys: { r: 'R', u: 'U', l: 'L', b: 'B', x: 'x', y: 'y', z: 'z' },
    keyHint: L('Phím R U L B, Shift = ngược', 'Keys R U L B, Shift = prime'),
  },
  megaminx: {
    id: 'megaminx',
    name: L('Megaminx', 'Megaminx'),
    blurb: L('Mười hai mặt ngũ giác, mỗi lần xoay một phần năm vòng. Cách giải khá giống 3×3, chỉ là nhiều mảnh hơn.', 'Twelve pentagon faces, each turning a fifth of a turn. Solving it feels a lot like a 3×3, just with more pieces.'),
    def: MEGAMINX,
    build: buildMegaPiece,
    core: megaCore,
    centre: new THREE.Vector3(),
    size: 3.3,
    pad: [
      ['U', 'F', 'R', 'L', 'BR', 'BL'],
      ['D', 'DR', 'DL', 'DBR', 'DBL', 'B'],
    ],
    keys: { u: 'U', f: 'F', r: 'R', l: 'L', d: 'D', b: 'B' },
    keyHint: L('Phím U F R L D B, Shift = ngược', 'Keys U F R L D B, Shift = prime'),
  },
}

export const PUZZLE_IDS = Object.keys(PUZZLES)
