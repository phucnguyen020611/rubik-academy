import * as THREE from 'three'
import {
  applyMove,
  createCube,
  isSolved,
  layerOf,
  moveFromLayer,
  parseMoves,
  type Axis,
  type CubeState,
  type Face,
  type Move,
  type Vec,
  normalToFace,
} from './engine'
import { COLORS, maskFn, schemeColors, type MaskFn, type SchemeName } from './schemes'
import type { MaskName } from '../data/beginner'

export interface CubeGeometries {
  body: THREE.BufferGeometry
  sticker: THREE.BufferGeometry
}

interface StickerSlot {
  cubie: number
  local: THREE.Matrix4
  homeFace: Face
}

interface Anim {
  move: Move
  from: number
  to: number
  t: number
  duration: number
  cubies: number[]
  commit: boolean
  onDone?: () => void
}

const AXES = [new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 1)]
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)

export const SPACING = 1.012

export interface ViewOptions {
  scheme?: SchemeName
  mask?: MaskName
  bodyColor?: string
}

/**
 * Imperative, instanced three.js cube. One InstancedMesh for plastic bodies, one for stickers.
 */
export class CubeView {
  readonly group = new THREE.Group()
  state: CubeState
  n: number
  speed = 190 // ms per quarter turn
  private geoms: CubeGeometries
  private bodies!: THREE.InstancedMesh
  private stickers!: THREE.InstancedMesh
  private stickerSlots: StickerSlot[] = []
  private stickersOf: number[][] = []
  private queue: { move: Move; animate: boolean; onDone?: () => void }[] = []
  private anim: Anim | null = null
  private assembly: { t: number; dur: number; seeds: { off: THREE.Vector3; axis: THREE.Vector3; ang: number; delay: number }[] } | null = null
  /** true while the cube is still flying together */
  get assembling() {
    return !!this.assembly
  }
  private drag: { axis: Axis; layers: number[]; angle: number; cubies: number[] } | null = null
  private scheme: SchemeName
  private mask: MaskFn
  private bodyMat: THREE.MeshPhysicalMaterial
  private stickerMat: THREE.MeshPhysicalMaterial
  private tmp = new THREE.Matrix4()
  private tmp2 = new THREE.Matrix4()
  listeners = new Set<(m: Move, solved: boolean) => void>()

  constructor(n: number, geoms: CubeGeometries, opts: ViewOptions = {}) {
    this.n = n
    this.geoms = geoms
    this.scheme = opts.scheme ?? 'standard'
    this.mask = maskFn(opts.mask)
    this.state = createCube(n)
    this.bodyMat = new THREE.MeshPhysicalMaterial({
      color: opts.bodyColor ?? '#0b0c0c',
      roughness: 0.38,
      metalness: 0,
      clearcoat: 0.35,
      clearcoatRoughness: 0.4,
    })
    this.stickerMat = new THREE.MeshPhysicalMaterial({
      color: '#ffffff',
      roughness: 0.24,
      metalness: 0,
      clearcoat: 0.9,
      clearcoatRoughness: 0.12,
      sheen: 0,
    })
    this.build()
  }

  // ---------------------------------------------------------------- build
  private build() {
    if (this.bodies) {
      this.group.remove(this.bodies, this.stickers)
      this.bodies.dispose()
      this.stickers.dispose()
    }
    const n = this.n
    const lim = n - 1
    const cubies = this.state.cubies
    this.stickerSlots = []
    this.stickersOf = cubies.map(() => [])
    const up = new THREE.Vector3(0, 1, 0)
    for (const c of cubies) {
      for (let a = 0; a < 3; a++)
        for (const sgn of [1, -1]) {
          if (c.home[a] !== sgn * lim) continue
          const nrm = new THREE.Vector3()
          nrm.setComponent(a, sgn)
          const q = new THREE.Quaternion().setFromUnitVectors(up, nrm)
          const hn: Vec = [0, 0, 0]
          hn[a] = sgn
          this.stickersOf[c.id].push(this.stickerSlots.length)
          this.stickerSlots.push({ cubie: c.id, local: new THREE.Matrix4().makeRotationFromQuaternion(q), homeFace: normalToFace(hn) })
        }
    }
    this.bodies = new THREE.InstancedMesh(this.geoms.body, this.bodyMat, cubies.length)
    this.stickers = new THREE.InstancedMesh(this.geoms.sticker, this.stickerMat, this.stickerSlots.length)
    for (const m of [this.bodies, this.stickers]) {
      m.castShadow = true
      m.receiveShadow = true
      m.frustumCulled = true
    }
    this.group.add(this.bodies, this.stickers)
    this.applyColors()
    this.syncAll()
  }

  private applyColors() {
    const col = new THREE.Color()
    const scheme = schemeColors(this.scheme)
    this.stickerSlots.forEach((s, i) => {
      const c = this.state.cubies[s.cubie]
      col.set(this.mask(c.home, s.homeFace, this.n) ? scheme[s.homeFace] : COLORS.grey)
      this.stickers.setColorAt(i, col)
    })
    if (this.stickers.instanceColor) this.stickers.instanceColor.needsUpdate = true
  }

  setScheme(scheme: SchemeName) {
    this.scheme = scheme
    this.applyColors()
  }

  setMask(mask?: MaskName) {
    this.mask = maskFn(mask)
    this.applyColors()
  }

  setBodyColor(c: string) {
    this.bodyMat.color.set(c)
  }

  setSize(n: number) {
    if (n === this.n) return this.reset()
    this.n = n
    this.queue = []
    this.anim = null
    this.drag = null
    this.assembly = null
    this.state = createCube(n)
    this.build()
  }

  // ---------------------------------------------------------------- matrices
  private baseMatrix(id: number, out: THREE.Matrix4) {
    const c = this.state.cubies[id]
    const r = c.rot
    const h = SPACING / 2
    out.set(r[0], r[1], r[2], c.pos[0] * h, r[3], r[4], r[5], c.pos[1] * h, r[6], r[7], r[8], c.pos[2] * h, 0, 0, 0, 1)
    return out
  }

  private writeCubie(id: number, pre?: THREE.Matrix4) {
    const m = this.baseMatrix(id, this.tmp)
    if (pre) m.premultiply(pre)
    this.writeCubieMatrix(id, m)
  }

  private writeCubieMatrix(id: number, m: THREE.Matrix4) {
    this.bodies.setMatrixAt(id, m)
    for (const si of this.stickersOf[id]) {
      this.tmp2.multiplyMatrices(m, this.stickerSlots[si].local)
      this.stickers.setMatrixAt(si, this.tmp2)
    }
  }

  private flush() {
    this.bodies.instanceMatrix.needsUpdate = true
    this.stickers.instanceMatrix.needsUpdate = true
    this.bodies.computeBoundingSphere()
    this.stickers.computeBoundingSphere()
  }

  syncAll() {
    for (const c of this.state.cubies) this.writeCubie(c.id)
    this.flush()
  }

  private cubiesIn(axis: Axis, layers: number[]) {
    const set = new Set(layers)
    return this.state.cubies.filter((c) => set.has(layerOf(c.pos[axis], this.n))).map((c) => c.id)
  }

  // ---------------------------------------------------------------- public API
  get busy() {
    return !!this.anim || this.queue.length > 0 || !!this.drag || !!this.assembly
  }

  /** Pieces fly in from around the cube and click together. */
  assemble(delayMs = 0, durationMs = 1100) {
    const seeds = this.state.cubies.map((c) => {
      const dir = new THREE.Vector3(c.pos[0], c.pos[1], c.pos[2])
      if (dir.lengthSq() === 0) dir.set(0, 1, 0)
      dir.normalize().add(new THREE.Vector3(Math.random() - 0.5, Math.random() * 0.6, Math.random() - 0.5).multiplyScalar(0.6)).normalize()
      const dist = (this.n * 0.9 + 1.2) * (0.8 + Math.random() * 0.5)
      return {
        off: dir.multiplyScalar(dist),
        axis: new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize(),
        ang: (Math.random() - 0.5) * Math.PI * 2.2,
        delay: Math.random() * 0.35,
      }
    })
    this.assembly = { t: -delayMs / 1000, dur: durationMs / 1000, seeds }
    this.writeAssembly()
  }

  private writeAssembly() {
    const a = this.assembly!
    const pos = new THREE.Vector3()
    const q = new THREE.Quaternion()
    const qa = new THREE.Quaternion()
    const s = new THREE.Vector3()
    const m = new THREE.Matrix4()
    const span = a.dur * 0.65
    for (const c of this.state.cubies) {
      const sd = a.seeds[c.id]
      const local = Math.min(1, Math.max(0, (a.t - sd.delay * a.dur * 0.5) / span))
      const e = 1 - Math.pow(1 - local, 3)
      this.baseMatrix(c.id, m)
      m.decompose(pos, q, s)
      pos.addScaledVector(sd.off, 1 - e)
      qa.setFromAxisAngle(sd.axis, sd.ang * (1 - e))
      q.premultiply(qa)
      s.setScalar(Math.max(0.0001, Math.min(1, local * 2.2)))
      m.compose(pos, q, s)
      this.writeCubieMatrix(c.id, m)
    }
    this.flush()
  }

  get solved() {
    return isSolved(this.state)
  }

  reset() {
    this.queue = []
    this.anim = null
    this.drag = null
    this.state = createCube(this.n)
    this.syncAll()
  }

  /** Reset and apply an algorithm instantly. */
  setup(alg: string) {
    this.reset()
    for (const m of parseMoves(alg, this.n)) applyMove(this.state, m)
    this.syncAll()
  }

  clearQueue() {
    this.queue = []
  }

  enqueue(moves: Move[], animate = true, onDone?: () => void) {
    if (!moves.length) {
      onDone?.()
      return
    }
    moves.forEach((m, i) => this.queue.push({ move: m, animate, onDone: i === moves.length - 1 ? onDone : undefined }))
  }

  run(alg: string, animate = true, onDone?: () => void) {
    this.enqueue(parseMoves(alg, this.n), animate, onDone)
  }

  update(dt: number) {
    if (this.assembly) {
      this.assembly.t += dt
      if (this.assembly.t >= this.assembly.dur) {
        this.assembly = null
        this.syncAll()
      } else this.writeAssembly()
      return
    }
    let budget = 8
    while (!this.anim && this.queue.length && budget-- > 0) {
      const next = this.queue.shift()!
      if (!next.animate) {
        this.commit(next.move)
        next.onDone?.()
        continue
      }
      const turns = Math.abs(next.move.q)
      this.anim = {
        move: next.move,
        from: 0,
        to: (next.move.q * Math.PI) / 2,
        t: 0,
        duration: (this.speed * (turns === 2 ? 1.45 : 1)) / 1000,
        cubies: this.cubiesIn(next.move.axis, next.move.layers),
        commit: true,
        onDone: next.onDone,
      }
    }
    if (!this.anim) return
    const a = this.anim
    a.t = Math.min(1, a.t + dt / Math.max(0.001, a.duration))
    const angle = a.from + (a.to - a.from) * ease(a.t)
    const R = new THREE.Matrix4().makeRotationAxis(AXES[a.move.axis], angle)
    for (const id of a.cubies) this.writeCubie(id, R)
    this.flush()
    if (a.t >= 1) {
      this.anim = null
      if (a.commit && a.move.q % 4 !== 0) this.commit(a.move)
      else {
        for (const id of a.cubies) this.writeCubie(id)
        this.flush()
      }
      a.onDone?.()
    }
  }

  private commit(move: Move) {
    applyMove(this.state, move)
    const ids = this.cubiesIn(move.axis, move.layers)
    for (const id of ids) this.writeCubie(id)
    this.flush()
    const solved = this.solved
    this.listeners.forEach((l) => l(move, solved))
  }

  // ---------------------------------------------------------------- interaction
  pick(ray: THREE.Raycaster): { cubie: number; axis: Axis; sign: number; local: THREE.Vector3 } | null {
    const hits = ray.intersectObjects([this.bodies, this.stickers], false)
    const hit = hits[0]
    if (!hit || hit.instanceId === undefined) return null
    const id = hit.object === this.bodies ? hit.instanceId : this.stickerSlots[hit.instanceId].cubie
    const local = this.group.worldToLocal(hit.point.clone())
    const c = this.state.cubies[id]
    const h = SPACING / 2
    const d = [local.x - c.pos[0] * h, local.y - c.pos[1] * h, local.z - c.pos[2] * h]
    const order = [0, 1, 2].sort((a, b) => Math.abs(d[b]) - Math.abs(d[a])) as Axis[]
    const lim = this.n - 1
    for (const ax of order) {
      const sgn = Math.sign(d[ax]) || 1
      if (c.pos[ax] === sgn * lim) return { cubie: id, axis: ax, sign: sgn, local }
    }
    return null
  }

  beginDrag(axis: Axis, layer: number) {
    if (this.anim || this.queue.length) return false
    this.drag = { axis, layers: [layer], angle: 0, cubies: this.cubiesIn(axis, [layer]) }
    return true
  }

  setDragAngle(angle: number) {
    if (!this.drag) return
    this.drag.angle = angle
    const R = new THREE.Matrix4().makeRotationAxis(AXES[this.drag.axis], angle)
    for (const id of this.drag.cubies) this.writeCubie(id, R)
    this.flush()
  }

  endDrag(): void {
    const d = this.drag
    if (!d) return
    this.drag = null
    let q = Math.round(d.angle / (Math.PI / 2))
    // flick: commit a quarter turn when dragged a little past 30°
    if (q === 0 && Math.abs(d.angle) > Math.PI / 6) q = Math.sign(d.angle)
    const move = moveFromLayer(d.axis, d.layers[0], q, this.n)
    this.anim = {
      move,
      from: d.angle,
      to: (q * Math.PI) / 2,
      t: 0,
      duration: Math.max(0.08, (Math.abs(q * (Math.PI / 2) - d.angle) / (Math.PI / 2)) * (this.speed / 1000)),
      cubies: d.cubies,
      commit: q % 4 !== 0,
    }
  }

  dispose() {
    this.bodies.dispose()
    this.stickers.dispose()
    this.bodyMat.dispose()
    this.stickerMat.dispose()
  }
}
