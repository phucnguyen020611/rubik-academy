/** Everything the play page needs to know about each non-cube puzzle. */
import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import { L, type Tx } from '../i18n-core'
import { MIRROR, MIRROR_BOUNDS } from './defs'
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
    size: 2.9,
    pad: [
      ['U', 'D', 'R', 'L', 'F', 'B'],
      ['M', 'E', 'S', 'x', 'y', 'z'],
    ],
    keys: CUBE_KEYS,
    keyHint: L('Phím U R F D L B, Shift = ngược', 'Keys U R F D L B, Shift = prime'),
  },
}

export const PUZZLE_IDS = Object.keys(PUZZLES)
