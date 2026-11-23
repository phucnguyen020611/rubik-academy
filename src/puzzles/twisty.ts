/**
 * A small engine for any puzzle whose moves are "rotate every piece on one side of a cut plane
 * around that plane's normal": cubes, mirror blocks, Pyraminx, Skewb, Megaminx…
 *
 * A piece is described by an anchor point (where the mechanism holds it) and the outward normals
 * of its visible faces. State is one rotation per piece. Everything is pure maths so the same code
 * runs in the browser and in the verification scripts.
 */
import { Quaternion, Vector3 } from 'three'

export type Vec = [number, number, number]

export interface TurnDef {
  /** rotation axis; a positive turn is clockwise when looking at the puzzle from +axis */
  axis: Vec
  /** how many turns make a full revolution (4 for cubes, 3 for Pyraminx, 5 for Megaminx) */
  order: number
  /** pieces whose anchor·axis lies in (min, max] are turned */
  min: number
  max?: number
}

export interface PieceDef {
  anchor: Vec
  /** outward normals of the faces you can see when the puzzle is solved */
  faces: Vec[]
}

export interface TwistyDef {
  id: string
  pieces: PieceDef[]
  turns: Record<string, TurnDef>
  /** turns a random scramble is drawn from */
  scrambleTurns: string[]
  scrambleLength: number
  /** turns given a random 0 / +1 / -1 at the end of a scramble (Pyraminx tips) */
  scrambleTips?: string[]
}

export interface TwistyMove {
  turn: string
  /** signed number of steps; +1 = one clockwise step */
  amount: number
}

export type TwistyState = Quaternion[]

const EPS = 1e-4
const v3 = (v: Vec) => new Vector3(v[0], v[1], v[2])

export function solvedState(def: TwistyDef): TwistyState {
  return def.pieces.map(() => new Quaternion())
}

export function cloneState(s: TwistyState): TwistyState {
  return s.map((q) => q.clone())
}

/** normalise a step count into (-order/2, order/2] so R3 becomes R' */
export function normaliseAmount(amount: number, order: number) {
  let a = ((amount % order) + order) % order
  if (a > order / 2) a -= order
  return a
}

export function moveLabel(def: TwistyDef, m: TwistyMove) {
  const order = def.turns[m.turn].order
  const a = normaliseAmount(m.amount, order)
  if (a === 1) return m.turn
  if (a === -1) return `${m.turn}'`
  if (order === 4 && Math.abs(a) === 2) return `${m.turn}2`
  if (order === 5) return `${m.turn}${a > 0 ? '++' : '--'}`
  return `${m.turn}${Math.abs(a)}${a < 0 ? "'" : ''}`
}

/** Parse "R U' F2 R++ D--" against the puzzle's turn names. Unknown tokens make the whole string invalid. */
export function parseTwisty(def: TwistyDef, text: string): TwistyMove[] | null {
  const out: TwistyMove[] = []
  const names = Object.keys(def.turns).sort((a, b) => b.length - a.length)
  for (const tok of text.trim().split(/\s+/).filter(Boolean)) {
    const name = names.find((n) => tok.startsWith(n))
    if (!name) return null
    const rest = tok.slice(name.length).replace(/’|′/g, "'")
    let amount: number
    if (rest === '') amount = 1
    else if (rest === "'") amount = -1
    else if (rest === '++') amount = 2
    else if (rest === '--') amount = -2
    else {
      const m = /^(\d+)('?)$/.exec(rest)
      if (!m) return null
      amount = Number(m[1]) * (m[2] ? -1 : 1)
    }
    out.push({ turn: name, amount })
  }
  return out
}

export function invertMoves(moves: TwistyMove[]): TwistyMove[] {
  return [...moves].reverse().map((m) => ({ turn: m.turn, amount: -m.amount }))
}

/** rotation that a move applies (about the origin) */
export function moveRotation(def: TwistyDef, m: TwistyMove, fraction = 1) {
  const t = def.turns[m.turn]
  return new Quaternion().setFromAxisAngle(v3(t.axis).normalize(), (-m.amount * fraction * Math.PI * 2) / t.order)
}

/** indices of the pieces a turn would move in this state */
export function turnPieces(def: TwistyDef, state: TwistyState, turn: string): number[] {
  const t = def.turns[turn]
  const axis = v3(t.axis).normalize()
  const out: number[] = []
  def.pieces.forEach((p, i) => {
    const d = v3(p.anchor).applyQuaternion(state[i]).dot(axis)
    if (d > t.min + EPS && (t.max === undefined || d <= t.max + EPS)) out.push(i)
  })
  return out
}

export function applyMove(def: TwistyDef, state: TwistyState, m: TwistyMove): TwistyState {
  const rot = moveRotation(def, m)
  const next = cloneState(state)
  for (const i of turnPieces(def, state, m.turn)) next[i].premultiply(rot).normalize()
  return next
}

export function applyMoves(def: TwistyDef, state: TwistyState, moves: TwistyMove[]) {
  return moves.reduce((s, m) => applyMove(def, s, m), state)
}

const key = (v: Vector3) => `${Math.round(v.x * 1000)},${Math.round(v.y * 1000)},${Math.round(v.z * 1000)}`

/**
 * Solved means every face that started out pointing one way points the same way again,
 * so turning the whole puzzle over still counts as solved.
 */
export function isSolved(def: TwistyDef, state: TwistyState) {
  const groups = new Map<string, string>()
  for (let i = 0; i < def.pieces.length; i++) {
    for (const f of def.pieces[i].faces) {
      const home = key(v3(f).normalize())
      const now = key(v3(f).normalize().applyQuaternion(state[i]))
      const seen = groups.get(home)
      if (seen === undefined) groups.set(home, now)
      else if (seen !== now) return false
    }
  }
  return true
}

/** random-move scramble that never turns the same axis twice in a row */
export function randomScramble(def: TwistyDef, rnd: () => number = Math.random): TwistyMove[] {
  const out: TwistyMove[] = []
  let lastAxis: Vector3 | null = null
  while (out.length < def.scrambleLength) {
    const turn = def.scrambleTurns[Math.floor(rnd() * def.scrambleTurns.length)]
    const t = def.turns[turn]
    const axis = v3(t.axis).normalize()
    if (lastAxis && Math.abs(axis.dot(lastAxis)) > 0.999) continue
    const choices: number[] = []
    for (let a = 1; a <= Math.floor(t.order / 2); a++) {
      choices.push(a)
      if (a * 2 !== t.order) choices.push(-a)
    }
    out.push({ turn, amount: choices[Math.floor(rnd() * choices.length)] })
    lastAxis = axis
  }
  for (const tip of def.scrambleTips ?? []) {
    const r = Math.floor(rnd() * 3)
    if (r) out.push({ turn: tip, amount: r === 1 ? 1 : -1 })
  }
  return out
}
