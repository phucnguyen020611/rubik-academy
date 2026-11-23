import * as THREE from 'three'
import {
  applyMove,
  isSolved,
  moveLabel,
  normaliseAmount,
  parseTwisty,
  solvedState,
  turnPieces,
  type TwistyDef,
  type TwistyMove,
  type TwistyState,
} from './twisty'

type Listener = (label: string, solved: boolean) => void

interface Job {
  move: TwistyMove
  notify: boolean
  done?: () => void
}

interface Anim {
  pieces: number[]
  axis: THREE.Vector3
  from: number
  to: number
  t: number
  dur: number
  move: TwistyMove | null
  notify: boolean
  done?: () => void
}

const ease = (x: number) => 1 - Math.pow(1 - x, 3)

/** Imperative scene object for one twisty puzzle: pieces, turn animation, picking and drag turns. */
export class TwistyView {
  readonly group = new THREE.Group()
  /** pieces live here; its origin is the mechanism centre (the point every turn rotates around) */
  readonly content = new THREE.Group()
  readonly listeners = new Set<Listener>()
  state: TwistyState
  speed = 180
  private objs: THREE.Object3D[]
  private queue: Job[] = []
  private anim: Anim | null = null
  private drag: { turn: string; pieces: number[]; axis: THREE.Vector3; angle: number } | null = null
  readonly def: TwistyDef

  constructor(def: TwistyDef, build: (i: number) => THREE.Object3D, centre: THREE.Vector3, core?: THREE.Object3D) {
    this.def = def
    this.state = solvedState(def)
    this.objs = def.pieces.map((_, i) => {
      const o = build(i)
      o.traverse((c) => {
        c.userData.piece = i
        const m = c as THREE.Mesh
        if (m.isMesh) {
          m.castShadow = true
          m.receiveShadow = true
        }
      })
      this.content.add(o)
      return o
    })
    if (core) this.content.add(core)
    this.content.position.copy(centre).negate()
    this.group.add(this.content)
  }

  get busy() {
    return !!this.anim || this.queue.length > 0 || !!this.drag
  }

  get solved() {
    return isSolved(this.def, this.state)
  }

  /** queue moves (text in the puzzle's notation, or parsed moves) */
  run(moves: string | TwistyMove[], notify = true, done?: () => void) {
    const list = typeof moves === 'string' ? parseTwisty(this.def, moves) : moves
    if (!list || !list.length) {
      done?.()
      return
    }
    list.forEach((move, i) => this.queue.push({ move, notify, done: i === list.length - 1 ? done : undefined }))
  }

  reset() {
    this.queue = []
    this.anim = null
    this.drag = null
    this.state = solvedState(this.def)
    this.sync()
  }

  clearQueue() {
    this.queue = []
  }

  private sync() {
    this.objs.forEach((o, i) => o.quaternion.copy(this.state[i]))
  }

  private showRotation(pieces: number[], axis: THREE.Vector3, angle: number) {
    const q = new THREE.Quaternion().setFromAxisAngle(axis, angle)
    for (const i of pieces) this.objs[i].quaternion.copy(q).multiply(this.state[i])
  }

  private commit(move: TwistyMove, notify: boolean) {
    this.state = applyMove(this.def, this.state, move)
    this.sync()
    if (notify) {
      const label = moveLabel(this.def, move)
      const solved = this.solved
      this.listeners.forEach((l) => l(label, solved))
    }
  }

  update(dt: number) {
    if (!this.anim && !this.drag && this.queue.length) {
      const job = this.queue.shift()!
      const t = this.def.turns[job.move.turn]
      const steps = Math.abs(normaliseAmount(job.move.amount, t.order))
      this.anim = {
        pieces: turnPieces(this.def, this.state, job.move.turn),
        axis: new THREE.Vector3(...t.axis).normalize(),
        from: 0,
        to: (-job.move.amount * Math.PI * 2) / t.order,
        t: 0,
        dur: (this.speed / 1000) * (steps > 1 ? 1.45 : 1),
        move: job.move,
        notify: job.notify,
        done: job.done,
      }
    }
    const a = this.anim
    if (!a) return
    a.t += a.dur > 0 ? dt / a.dur : 1
    if (a.t >= 1) {
      this.anim = null
      if (a.move && normaliseAmount(a.move.amount, this.def.turns[a.move.turn].order) !== 0) this.commit(a.move, a.notify)
      else this.sync()
      a.done?.()
      return
    }
    this.showRotation(a.pieces, a.axis, a.from + (a.to - a.from) * ease(a.t))
  }

  /** what's under the pointer: piece, face normal and hit point in puzzle space */
  pick(ray: THREE.Raycaster) {
    const hit = ray.intersectObject(this.content, true).find((h) => h.object.userData.piece !== undefined && h.face)
    if (!hit) return null
    const inv = new THREE.Matrix4().copy(this.content.matrixWorld).invert()
    const point = hit.point.clone().applyMatrix4(inv)
    const nm = new THREE.Matrix3().getNormalMatrix(hit.object.matrixWorld)
    const normal = hit.face!.normal.clone().applyMatrix3(nm).normalize()
    const contentRot = new THREE.Quaternion()
    this.content.getWorldQuaternion(contentRot)
    normal.applyQuaternion(contentRot.invert()).normalize()
    return { piece: hit.object.userData.piece as number, point, normal }
  }

  /** start following the pointer with one turn; returns false if the puzzle is busy */
  beginDrag(turn: string) {
    if (this.busy) return false
    const t = this.def.turns[turn]
    this.drag = { turn, pieces: turnPieces(this.def, this.state, turn), axis: new THREE.Vector3(...t.axis).normalize(), angle: 0 }
    return true
  }

  /** angle in radians, anticlockwise about the turn axis */
  setDragAngle(angle: number) {
    if (!this.drag) return
    this.drag.angle = angle
    this.showRotation(this.drag.pieces, this.drag.axis, angle)
  }

  /** snap to the nearest step and record the move */
  endDrag() {
    const d = this.drag
    if (!d) return
    this.drag = null
    const order = this.def.turns[d.turn].order
    const step = (Math.PI * 2) / order
    let k = Math.round(d.angle / step)
    // a confident flick counts even if it didn't reach half a step
    if (k === 0 && Math.abs(d.angle) > step * 0.28) k = Math.sign(d.angle)
    this.anim = {
      pieces: d.pieces,
      axis: d.axis,
      from: d.angle,
      to: k * step,
      t: 0,
      dur: Math.max(0.08, (this.speed / 1000) * Math.min(1, Math.abs(k * step - d.angle) / step + 0.2)),
      move: k ? { turn: d.turn, amount: -k } : null,
      notify: true,
    }
  }

  dispose() {
    this.content.traverse((o) => {
      const m = o as THREE.Mesh
      if (m.isMesh) m.geometry.dispose()
    })
  }
}
