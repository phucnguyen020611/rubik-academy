/** Mesh helpers for building puzzle pieces from flat sticker polygons. */
import * as THREE from 'three'

export interface Poly {
  pts: THREE.Vector3[]
  color: string
}

let shared: { body: THREE.Material; sticker: THREE.Material } | null = null
export const pieceMaterials = () =>
  (shared ??= {
    body: new THREE.MeshStandardMaterial({ color: '#121314', roughness: 0.42, side: THREE.DoubleSide }),
    sticker: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.26 }),
  })

const centroid = (pts: THREE.Vector3[]) => pts.reduce((a, p) => a.add(p), new THREE.Vector3()).divideScalar(pts.length)

/** outward normal of a polygon, flipped if needed so it points away from `inside` */
function outward(pts: THREE.Vector3[], inside: THREE.Vector3) {
  const n = new THREE.Vector3().subVectors(pts[1], pts[0]).cross(new THREE.Vector3().subVectors(pts[2], pts[0])).normalize()
  if (n.dot(new THREE.Vector3().subVectors(centroid(pts), inside)) < 0) return { n: n.negate(), pts: [...pts].reverse() }
  return { n, pts }
}

function finish(pos: number[], col?: number[]) {
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  if (col) g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3))
  g.computeVertexNormals()
  return g
}

/** coloured sticker tiles, shrunk towards their own centre and lifted off the body */
export function stickerGeometry(polys: Poly[], inside: THREE.Vector3, shrink = 0.82, lift = 0.012) {
  const pos: number[] = []
  const col: number[] = []
  for (const p of polys) {
    const o = outward(p.pts, inside)
    const c = centroid(o.pts)
    const pts = o.pts.map((q) => q.clone().sub(c).multiplyScalar(shrink).add(c).addScaledVector(o.n, lift))
    const cc = c.clone().addScaledVector(o.n, lift)
    const k = new THREE.Color(p.color)
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i]
      const b = pts[(i + 1) % pts.length]
      pos.push(cc.x, cc.y, cc.z, a.x, a.y, a.z, b.x, b.y, b.z)
      for (let j = 0; j < 3; j++) col.push(k.r, k.g, k.b)
    }
  }
  return finish(pos, col)
}

/**
 * Solid body under each polygon: the polygon (slightly shrunk to leave a seam) joined to a
 * floor polygon `depth` of the way towards `apex` (depth 1 = a full pyramid to the apex).
 */
export function bodyGeometry(polys: Poly[], apex: THREE.Vector3, depth = 1, seam = 0.97) {
  const pos: number[] = []
  const tri = (a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3) => pos.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z)
  for (const p of polys) {
    const o = outward(p.pts, apex)
    const c = centroid(o.pts)
    const top = o.pts.map((q) => q.clone().sub(c).multiplyScalar(seam).add(c))
    const bottom = top.map((q) => q.clone().lerp(apex, depth))
    const ct = centroid(top)
    for (let i = 0; i < top.length; i++) {
      const j = (i + 1) % top.length
      tri(ct, top[i], top[j])
      // sides (two triangles, wound outward)
      tri(top[j], top[i], bottom[i])
      tri(top[j], bottom[i], bottom[j])
    }
    if (depth < 1) {
      const cb = centroid(bottom)
      for (let i = 0; i < bottom.length; i++) tri(cb, bottom[(i + 1) % bottom.length], bottom[i])
    }
  }
  return finish(pos)
}

/** vertical prism of a floor-plan polygon between heights y0 and y1, shrunk a touch to leave seams */
export function prismGeometry(plan: THREE.Vector2[], y0: number, y1: number, seam = 0.97) {
  const c = plan.reduce((a, p) => a.add(p), new THREE.Vector2()).divideScalar(plan.length)
  const pts = plan.map((p) => p.clone().sub(c).multiplyScalar(seam).add(c))
  const g = (seam - 1) * (y1 - y0) * -0.5
  const lo = y0 + g
  const hi = y1 - g
  const pos: number[] = []
  const tri = (a: number[], b: number[], d: number[]) => pos.push(...a, ...b, ...d)
  const at = (p: THREE.Vector2, y: number) => [p.x, y, p.y]
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i]
    const b = pts[(i + 1) % pts.length]
    tri(at(c, hi), at(a, hi), at(b, hi))
    tri(at(c, lo), at(b, lo), at(a, lo))
    tri(at(a, lo), at(b, lo), at(b, hi))
    tri(at(a, lo), at(b, hi), at(a, hi))
  }
  return finish(pos)
}

export function pieceObject(stickers: THREE.BufferGeometry, body: THREE.BufferGeometry) {
  const g = new THREE.Group()
  g.add(new THREE.Mesh(body, pieceMaterials().body))
  g.add(new THREE.Mesh(stickers, pieceMaterials().sticker))
  return g
}
