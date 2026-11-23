/**
 * Display models for the showroom: twisty-puzzle variants and the speed-stack timer.
 * Each puzzle is built procedurally as one black body + one vertex-coloured sticker mesh,
 * so a whole puzzle costs two draw calls.
 */
import { useMemo } from 'react'
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { COLORS } from '../cube/schemes'
import { clockFaceTexture, faceplateTexture, lcdTexture, padTexture } from './textures'

type V3 = THREE.Vector3
const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z)

/** Collects flat sticker polygons (shrunk towards their centre, lifted off the body) into one geometry. */
class StickerSheet {
  pos: number[] = []
  col: number[] = []
  add(poly: V3[], color: string, shrink = 0.84, lift = 0.004, centre = new THREE.Vector3()) {
    const c = poly.reduce((a, p) => a.add(p), new THREE.Vector3()).divideScalar(poly.length)
    let n = new THREE.Vector3().subVectors(poly[1], poly[0]).cross(new THREE.Vector3().subVectors(poly[2], poly[0])).normalize()
    if (n.dot(new THREE.Vector3().subVectors(c, centre)) < 0) {
      poly = [...poly].reverse()
      n = n.negate()
    }
    const pts = poly.map((p) => p.clone().sub(c).multiplyScalar(shrink).add(c).addScaledVector(n, lift))
    const k = new THREE.Color(color)
    const cc = c.clone().addScaledVector(n, lift)
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i]
      const b = pts[(i + 1) % pts.length]
      this.pos.push(cc.x, cc.y, cc.z, a.x, a.y, a.z, b.x, b.y, b.z)
      for (let j = 0; j < 3; j++) this.col.push(k.r, k.g, k.b)
    }
  }
  geometry() {
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3))
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.col, 3))
    g.computeVertexNormals()
    return g
  }
}

/** Convex body from outward-facing polygons (fan triangulated). */
function polyBody(faces: V3[][], centre = new THREE.Vector3()) {
  const s = new StickerSheet()
  for (const f of faces) s.add(f, '#000000', 1, 0, centre)
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(s.pos, 3))
  g.computeVertexNormals()
  return g
}

function Puzzle({ body, stickers, y = 0 }: { body: THREE.BufferGeometry; stickers: THREE.BufferGeometry; y?: number }) {
  return (
    <group position-y={y}>
      <mesh geometry={body} castShadow receiveShadow>
        <meshStandardMaterial color="#121314" roughness={0.38} />
      </mesh>
      <mesh geometry={stickers} receiveShadow>
        <meshStandardMaterial vertexColors roughness={0.24} />
      </mesh>
    </group>
  )
}

// ------------------------------------------------------------------ pyraminx
export function Pyraminx({ size = 0.62 }: { size?: number }) {
  const geo = useMemo(() => {
    const r = size / Math.sqrt(3)
    const h = size * Math.sqrt(2 / 3)
    const base = [0, 1, 2].map((i) => v(r * Math.sin((i * Math.PI * 2) / 3), 0, r * Math.cos((i * Math.PI * 2) / 3)))
    const apex = v(0, h, 0)
    const centre = v(0, h / 4, 0)
    const faces: [V3, V3, V3, string][] = [
      [base[0], base[1], apex, COLORS.green],
      [base[1], base[2], apex, COLORS.blue],
      [base[2], base[0], apex, COLORS.red],
      [base[0], base[2], base[1], COLORS.yellow],
    ]
    const sheet = new StickerSheet()
    // a few tips and corners turned, so it reads as a puzzle rather than a pyramid
    const twist: Record<string, string> = { '0-2': COLORS.red, '2-8': COLORS.green, '1-0': COLORS.blue }
    faces.forEach(([a, b, c, col], fi) => {
      const P = (i: number, j: number) => a.clone().addScaledVector(b.clone().sub(a), i / 3).addScaledVector(c.clone().sub(a), j / 3)
      let k = 0
      for (let i = 0; i < 3; i++)
        for (let j = 0; i + j < 3; j++) {
          sheet.add([P(i, j), P(i + 1, j), P(i, j + 1)], twist[`${fi}-${k}`] ?? col, 0.8, 0.003, centre)
          k++
          if (i + j < 2) {
            sheet.add([P(i + 1, j), P(i + 1, j + 1), P(i, j + 1)], twist[`${fi}-${k}`] ?? col, 0.8, 0.003, centre)
            k++
          }
        }
    })
    const body = polyBody(faces.map(([a, b, c]) => [a, b, c]), centre)
    return { body, stickers: sheet.geometry() }
  }, [size])
  return <Puzzle {...geo} />
}

// ------------------------------------------------------------------ skewb
export function Skewb({ size = 0.5 }: { size?: number }) {
  const geo = useMemo(() => {
    const h = size / 2
    const sheet = new StickerSheet()
    const faces: [V3, V3, V3, string][] = [
      [v(0, 1, 0), v(1, 0, 0), v(0, 0, 1), COLORS.white],
      [v(0, -1, 0), v(1, 0, 0), v(0, 0, -1), COLORS.yellow],
      [v(0, 0, 1), v(1, 0, 0), v(0, -1, 0), COLORS.green],
      [v(0, 0, -1), v(-1, 0, 0), v(0, -1, 0), COLORS.blue],
      [v(1, 0, 0), v(0, 0, -1), v(0, -1, 0), COLORS.red],
      [v(-1, 0, 0), v(0, 0, 1), v(0, -1, 0), COLORS.orange],
    ]
    const swap: Record<string, string> = { '0-1': COLORS.red, '2-2': COLORS.white, '4-0': COLORS.green, '2-0': COLORS.orange, '5-3': COLORS.green }
    faces.forEach(([n, r, d, col], fi) => {
      const at = (a: number, b: number) => n.clone().multiplyScalar(h).addScaledVector(r, a * h).addScaledVector(d, b * h)
      const mids = [at(0, -1), at(1, 0), at(0, 1), at(-1, 0)]
      sheet.add(mids, col, 0.84)
      const corners = [at(1, -1), at(1, 1), at(-1, 1), at(-1, -1)]
      corners.forEach((c, i) => sheet.add([c, mids[(i + 1) % 4], mids[i]], swap[`${fi}-${i}`] ?? col, 0.74))
    })
    const body = new THREE.BoxGeometry(size * 0.995, size * 0.995, size * 0.995)
    return { body, stickers: sheet.geometry() }
  }, [size])
  return <Puzzle {...geo} y={size / 2} />
}

// ------------------------------------------------------------------ megaminx
const MEGA_COLOURS = ['#f5f6f1', '#d7263d', '#00a35c', '#7b3fa0', '#ffd60a', '#0a5bd6', '#cbbf9f', '#ff7a00', '#86d24a', '#5ec8f2', '#ff8fb8', '#fff1a8']

export function Megaminx({ size = 0.66 }: { size?: number }) {
  const geo = useMemo(() => {
    const phi = (1 + Math.sqrt(5)) / 2
    const verts: V3[] = []
    for (const x of [-1, 1]) for (const y of [-1, 1]) for (const z of [-1, 1]) verts.push(v(x, y, z))
    for (const a of [-1, 1])
      for (const b of [-1, 1]) {
        verts.push(v(0, a / phi, b * phi), v(a / phi, b * phi, 0), v(a * phi, 0, b / phi))
      }
    const normals: V3[] = []
    for (const a of [-1, 1])
      for (const b of [-1, 1]) {
        normals.push(v(a, 0, b * phi).normalize(), v(0, a * phi, b).normalize(), v(a * phi, b, 0).normalize())
      }
    const scale = size / 2 / Math.sqrt(3)
    const sheet = new StickerSheet()
    const bodyFaces: V3[][] = []
    const S = 0.46
    normals.forEach((n, fi) => {
      const five = [...verts].sort((p, q) => q.dot(n) - p.dot(n)).slice(0, 5)
      const c = five.reduce((a, p) => a.add(p), new THREE.Vector3()).divideScalar(5)
      const u = five[0].clone().sub(c).normalize()
      const w = n.clone().cross(u)
      five.sort((p, q) => Math.atan2(p.clone().sub(c).dot(w), p.clone().sub(c).dot(u)) - Math.atan2(q.clone().sub(c).dot(w), q.clone().sub(c).dot(u)))
      const V = five.map((p) => p.clone().multiplyScalar(scale))
      const C = c.clone().multiplyScalar(scale)
      bodyFaces.push(V)
      const Q = V.map((p) => C.clone().lerp(p, S))
      // intersection of the line through q with direction d and the segment a→b
      const hit = (q: V3, d: V3, a: V3, b: V3) => {
        const e = b.clone().sub(a)
        const aq = a.clone().sub(q)
        const dd = d.dot(d)
        const de = d.dot(e)
        const ee = e.dot(e)
        const t = (dd * e.dot(aq) - de * d.dot(aq)) / (de * de - dd * ee)
        return a.clone().addScaledVector(e, t)
      }
      const col = MEGA_COLOURS[fi]
      sheet.add(Q, col, 0.88)
      for (let i = 0; i < 5; i++) {
        const prev = (i + 4) % 5
        const next = (i + 1) % 5
        const ei = V[next].clone().sub(V[i])
        const eprev = V[i].clone().sub(V[prev])
        const X = hit(Q[i], eprev, V[i], V[next]) // line parallel to the previous edge, landing on this edge
        const Y = hit(Q[i], ei, V[prev], V[i])
        sheet.add([V[i], X, Q[i], Y], col, 0.8)
        const X2 = hit(Q[next], V[(i + 2) % 5].clone().sub(V[next]), V[i], V[next])
        sheet.add([X, X2, Q[next], Q[i]], col, 0.8)
      }
    })
    // rest on a face
    const m = new THREE.Matrix4().makeRotationFromQuaternion(new THREE.Quaternion().setFromUnitVectors(normals[1].clone().negate(), v(0, -1, 0)))
    const body = polyBody(bodyFaces)
    const stickers = sheet.geometry()
    body.applyMatrix4(m)
    stickers.applyMatrix4(m)
    return { body, stickers }
  }, [size])
  return <Puzzle {...geo} y={(size / 2) * 0.7947} />
}

// ------------------------------------------------------------------ square-1
export function SquareOne({ size = 0.52 }: { size?: number }) {
  const geo = useMemo(() => {
    const h = size / 2
    const t = Math.tan(Math.PI / 12)
    const band = h / 3
    const sheet = new StickerSheet()
    const cols = { U: COLORS.white, D: COLORS.yellow, F: COLORS.green, B: COLORS.blue, R: COLORS.red, L: COLORS.orange }
    for (const [y, col] of [
      [h, cols.U],
      [-h, cols.D],
    ] as const) {
      const C = v(0, y, 0)
      const P = (x: number, z: number) => v(x * h, y, z * h)
      sheet.add([C, P(1, -t), P(1, t)], col, 0.82)
      sheet.add([C, P(-1, t), P(-1, -t)], col, 0.82)
      sheet.add([C, P(t, 1), P(-t, 1)], col, 0.82)
      sheet.add([C, P(-t, -1), P(t, -1)], col, 0.82)
      for (const [sx, sz] of [
        [1, 1],
        [1, -1],
        [-1, 1],
        [-1, -1],
      ])
        sheet.add([C, P(sx, sz * t), P(sx, sz), P(sx * t, sz)], col, 0.86)
    }
    // sides: n = outward normal, r = horizontal direction on that face
    const sides: [V3, V3, string, number][] = [
      [v(0, 0, 1), v(1, 0, 0), cols.F, t],
      [v(0, 0, -1), v(-1, 0, 0), cols.B, t],
      [v(1, 0, 0), v(0, 0, -1), cols.R, 2],
      [v(-1, 0, 0), v(0, 0, 1), cols.L, 2],
    ]
    for (const [n, r, col, cut] of sides) {
      const at = (a: number, y: number) => n.clone().multiplyScalar(h).addScaledVector(r, a * h).setY(y)
      for (const [y0, y1] of [
        [band, h],
        [-h, -band],
      ]) {
        for (const [a0, a1] of [
          [-1, -t],
          [-t, t],
          [t, 1],
        ])
          sheet.add([at(a0, y0), at(a1, y0), at(a1, y1), at(a0, y1)], col, 0.86)
      }
      if (cut < 1) {
        sheet.add([at(-1, -band), at(cut, -band), at(cut, band), at(-1, band)], col, 0.9)
        sheet.add([at(cut, -band), at(1, -band), at(1, band), at(cut, band)], col, 0.86)
      } else sheet.add([at(-1, -band), at(1, -band), at(1, band), at(-1, band)], col, 0.92)
    }
    const body = new THREE.BoxGeometry(size * 0.995, size * 0.995, size * 0.995)
    return { body, stickers: sheet.geometry() }
  }, [size])
  return (
    <group position-y={size / 2}>
      <Puzzle {...geo} />
    </group>
  )
}

// ------------------------------------------------------------------ mirror cube
export function MirrorCube({ size = 0.56 }: { size?: number }) {
  const geometry = useMemo(() => {
    // the mechanism is an ordinary 3x3 (cuts at ±0.5); the outer faces sit at uneven distances
    const bounds = [
      [-1.62, 1.28],
      [-1.2, 1.7],
      [-1.4, 1.5],
    ]
    type Piece = { p: number[]; m: THREE.Matrix4; box: [number, number][] }
    const pieces: Piece[] = []
    const span = (axis: number, i: number): [number, number] => (i < 0 ? [bounds[axis][0], -0.5] : i > 0 ? [0.5, bounds[axis][1]] : [-0.5, 0.5])
    for (let x = -1; x <= 1; x++)
      for (let y = -1; y <= 1; y++)
        for (let z = -1; z <= 1; z++) pieces.push({ p: [x, y, z], m: new THREE.Matrix4(), box: [span(0, x), span(1, y), span(2, z)] })
    const axes = [v(1, 0, 0), v(0, 1, 0), v(0, 0, 1)]
    const turn = (axis: number, layer: number, q: number) => {
      const rot = new THREE.Matrix4().makeRotationAxis(axes[axis], (-q * Math.PI) / 2)
      for (const pc of pieces) {
        if (pc.p[axis] !== layer) continue
        const np = v(pc.p[0], pc.p[1], pc.p[2]).applyMatrix4(rot)
        pc.p = [Math.round(np.x), Math.round(np.y), Math.round(np.z)]
        pc.m.premultiply(rot)
      }
    }
    turn(0, 1, 1) // R
    turn(1, 1, 1) // U
    turn(0, 1, -1) // R'
    turn(2, 1, 1) // F
    const geos = pieces.map((pc) => {
      const [[x0, x1], [y0, y1], [z0, z1]] = pc.box
      const g = new THREE.BoxGeometry(x1 - x0 - 0.04, y1 - y0 - 0.04, z1 - z0 - 0.04)
      g.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2)
      g.applyMatrix4(pc.m)
      return g
    })
    const merged = mergeGeometries(geos)!
    merged.computeBoundingBox()
    const bb = merged.boundingBox!
    const s = size / 2.9
    merged.translate(-(bb.min.x + bb.max.x) / 2, -bb.min.y, -(bb.min.z + bb.max.z) / 2)
    merged.scale(s, s, s)
    return merged
  }, [size])
  return (
    <mesh geometry={geometry} castShadow receiveShadow>
      <meshStandardMaterial color="#e9c873" metalness={0.75} roughness={0.2} />
    </mesh>
  )
}

// ------------------------------------------------------------------ clock
export function ClockPuzzle({ size = 0.5 }: { size?: number }) {
  const face = clockFaceTexture()
  const r = size / 2
  const pegs = [
    [-1, -1],
    [1, -1],
    [-1, 1],
    [1, 1],
  ]
  return (
    <group>
      {/* little acrylic easel */}
      <mesh position={[0, 0.012, 0]} castShadow receiveShadow>
        <boxGeometry args={[size * 0.7, 0.024, size * 0.36]} />
        <meshStandardMaterial color="#ffffff" transparent opacity={0.35} roughness={0.05} />
      </mesh>
      <group position={[0, r + 0.03, 0]} rotation-x={-0.12}>
        <mesh rotation-x={Math.PI / 2} castShadow>
          <cylinderGeometry args={[r, r, r * 0.22, 64]} />
          <meshStandardMaterial color="#1c3d8f" roughness={0.35} />
        </mesh>
        {[1, -1].map((side) => (
          <mesh key={side} position-z={side * r * 0.111} rotation-y={side < 0 ? Math.PI : 0}>
            <circleGeometry args={[r * 0.9, 64]} />
            <meshStandardMaterial map={face} roughness={0.3} />
          </mesh>
        ))}
        {pegs.map(([a, b]) => (
          <mesh key={`${a}${b}`} position={[a * r * 0.21, b * r * 0.21, r * 0.13]} rotation-x={Math.PI / 2}>
            <cylinderGeometry args={[r * 0.045, r * 0.045, r * 0.06, 16]} />
            <meshStandardMaterial color={a + b > 0 ? '#ffd21f' : '#f2f2f2'} roughness={0.3} />
          </mesh>
        ))}
        {[45, 135, 225, 315].map((deg) => (
          <mesh key={deg} position={[Math.cos((deg * Math.PI) / 180) * r * 0.98, Math.sin((deg * Math.PI) / 180) * r * 0.98, 0]} rotation-x={Math.PI / 2}>
            <cylinderGeometry args={[r * 0.17, r * 0.17, r * 0.12, 24]} />
            <meshStandardMaterial color="#e9edf3" roughness={0.4} />
          </mesh>
        ))}
      </group>
    </group>
  )
}

// ------------------------------------------------------------------ speed timer
/** shape drawn in the floor plane: x right, y = towards the back (−z) */
function flatShape(pts: [number, number][]) {
  const s = new THREE.Shape()
  pts.forEach(([x, z], i) => (i ? s.lineTo(x, -z) : s.moveTo(x, -z)))
  s.closePath()
  return s
}

function extrudeFlat(shape: THREE.Shape, depth: number, bevel: number) {
  const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 4, curveSegments: 6 })
  g.rotateX(-Math.PI / 2)
  g.translate(0, bevel, 0)
  return g
}

/** flat cap with UVs normalised to its own bounding box */
function capGeometry(shape: THREE.Shape) {
  const g = new THREE.ShapeGeometry(shape)
  g.computeBoundingBox()
  const bb = g.boundingBox!
  const uv = g.attributes.uv as THREE.BufferAttribute
  const p = g.attributes.position as THREE.BufferAttribute
  for (let i = 0; i < uv.count; i++) uv.setXY(i, (p.getX(i) - bb.min.x) / (bb.max.x - bb.min.x), (p.getY(i) - bb.min.y) / (bb.max.y - bb.min.y))
  g.rotateX(-Math.PI / 2)
  return g
}

function inset(pts: [number, number][], d: number): [number, number][] {
  // pull every vertex towards the centroid; fine for these near-convex outlines
  const cx = pts.reduce((a, p) => a + p[0], 0) / pts.length
  const cz = pts.reduce((a, p) => a + p[1], 0) / pts.length
  return pts.map(([x, z]) => {
    const dx = x - cx
    const dz = z - cz
    const l = Math.hypot(dx, dz)
    return [x - (dx / l) * d, z - (dz / l) * d * 1.6]
  })
}

const CONSOLE: [number, number][] = [
  [-0.19, 0.105],
  [0.19, 0.105],
  [0.232, 0.03],
  [0.205, -0.115],
  [-0.205, -0.115],
  [-0.232, 0.03],
]
const PAD: [number, number][] = [
  [0, -0.088],
  [0.33, -0.104],
  [0.405, -0.058],
  [0.405, 0.062],
  [0.345, 0.103],
  [0, 0.094],
]

/** Speed-stack timer: two touch pads either side of a raised console with a brushed plate and LCD. */
export function SpeedTimer({ time = '0:07.42', stand = true }: { time?: string; stand?: boolean }) {
  const parts = useMemo(() => {
    const consoleBody = extrudeFlat(flatShape(CONSOLE), 0.036, 0.014)
    const padBody = extrudeFlat(flatShape(PAD), 0.016, 0.009)
    const padCap = capGeometry(flatShape(inset(PAD, 0.016)))
    return { consoleBody, padBody, padCap }
  }, [])
  const pad = padTexture()
  const plate = faceplateTexture('RUBIK ACADEMY')
  const lcd = lcdTexture(time)
  const padTop = 0.016 + 0.018
  const consoleTop = 0.036 + 0.028
  const timer = (
    <group>
      {[1, -1].map((side) => (
        <group key={side} position-x={side * 0.17} rotation-y={side * 0.14} scale-x={side}>
          <mesh geometry={parts.padBody} castShadow receiveShadow>
            <meshStandardMaterial color="#0b0d10" roughness={0.42} />
          </mesh>
          <mesh geometry={parts.padCap} position-y={padTop + 0.0008} receiveShadow>
            <meshStandardMaterial map={pad} roughness={0.7} />
          </mesh>
        </group>
      ))}
      <mesh geometry={parts.consoleBody} castShadow receiveShadow>
        <meshStandardMaterial color="#0e1013" roughness={0.3} />
      </mesh>
      <group position={[0, consoleTop + 0.0008, -0.006]} rotation-x={-Math.PI / 2}>
        <mesh receiveShadow>
          <planeGeometry args={[0.35, 0.197]} />
          <meshStandardMaterial map={plate} metalness={0.55} roughness={0.38} alphaTest={0.5} />
        </mesh>
        <mesh position={[0, 0.0466, 0.0008]}>
          <planeGeometry args={[0.137, 0.064]} />
          <meshStandardMaterial map={lcd} roughness={0.15} emissive="#9fb09a" emissiveMap={lcd} emissiveIntensity={0.18} />
        </mesh>
      </group>
    </group>
  )
  if (!stand) return timer
  // shown on a clear display stand, tilted towards the viewer like a product shot
  const tilt = 0.95
  return (
    <group>
      <mesh position={[0, 0.01, -0.02]} castShadow receiveShadow>
        <boxGeometry args={[0.62, 0.02, 0.26]} />
        <meshStandardMaterial color="#ffffff" transparent opacity={0.3} roughness={0.04} />
      </mesh>
      <mesh position={[0, 0.115, -0.085]} rotation-x={tilt}>
        <boxGeometry args={[0.5, 0.012, 0.24]} />
        <meshStandardMaterial color="#ffffff" transparent opacity={0.25} roughness={0.04} />
      </mesh>
      <group position={[0, 0.14, -0.05]} rotation-x={tilt}>
        {timer}
      </group>
    </group>
  )
}
