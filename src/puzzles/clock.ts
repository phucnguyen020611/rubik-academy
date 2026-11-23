/**
 * Rubik's Clock model. Nine dials on each side; four pins; four wheels.
 *
 * Dials are stored per side in that side's own view (looking straight at it), row by row.
 * Values are unbounded step counts (one step = one hour = 30°) so the hands can animate the
 * long way round; the puzzle is solved when every value is a multiple of 12.
 *
 * A corner dial on the front is the same gear as the mirrored corner on the back, so turning it
 * clockwise from the front turns the back one anticlockwise (seen from the back).
 */

export type Pin = 'UL' | 'UR' | 'DL' | 'DR'
export type Side = 'front' | 'back'

export const PINS: Pin[] = ['UL', 'UR', 'DL', 'DR']

export interface ClockState {
  front: number[]
  back: number[]
}

export interface ClockTurn {
  kind: 'turn'
  side: Side
  /** pins that are up as seen from `side` */
  pins: Pin[]
  amount: number
}
export type ClockMove = ClockTurn | { kind: 'flip' }

const BLOCK: Record<Pin, number[]> = {
  UL: [0, 1, 3, 4],
  UR: [1, 2, 4, 5],
  DL: [3, 4, 6, 7],
  DR: [4, 5, 7, 8],
}
/** corner dial i on one side is corner MIRROR[i] on the other */
const MIRROR: Record<number, number> = { 0: 2, 2: 0, 6: 8, 8: 6 }

export const mirrorPin = (p: Pin): Pin => ({ UL: 'UR', UR: 'UL', DL: 'DR', DR: 'DL' })[p] as Pin
export const otherSide = (s: Side): Side => (s === 'front' ? 'back' : 'front')

export const solvedClock = (): ClockState => ({ front: Array(9).fill(0), back: Array(9).fill(0) })

export const isClockSolved = (s: ClockState) => [...s.front, ...s.back].every((v) => ((v % 12) + 12) % 12 === 0)

/** turn every dial joined to the given up-pins on one side */
export function applyTurn(s: ClockState, t: ClockTurn): ClockState {
  const next = { front: [...s.front], back: [...s.back] }
  const dials = new Set(t.pins.flatMap((p) => BLOCK[p]))
  const mine = next[t.side]
  const theirs = next[otherSide(t.side)]
  for (const d of dials) {
    mine[d] += t.amount
    if (d in MIRROR) theirs[MIRROR[d]] -= t.amount
  }
  return next
}

export function applyClockMoves(s: ClockState, moves: ClockMove[]) {
  return moves.reduce((acc, m) => (m.kind === 'turn' ? applyTurn(acc, m) : acc), s)
}

/**
 * What turning a wheel does. `pin` is the wheel's corner and `amount` is clockwise as seen by
 * someone looking at `view`; `frontUp` says which pins stick out of the front.
 */
export function wheelTurn(view: Side, frontUp: Record<Pin, boolean>, pin: Pin, amount: number): ClockTurn {
  // pins as seen from the side being looked at
  const upHere = (p: Pin) => (view === 'front' ? frontUp[p] : !frontUp[mirrorPin(p)])
  if (upHere(pin)) return { kind: 'turn', side: view, pins: PINS.filter(upHere), amount }
  const other = otherSide(view)
  const upThere = (p: Pin) => !upHere(mirrorPin(p))
  return { kind: 'turn', side: other, pins: PINS.filter(upThere), amount: -amount }
}

const NAMES: [string, Pin[]][] = [
  ['ALL', ['UL', 'UR', 'DL', 'DR']],
  ['U', ['UL', 'UR']],
  ['D', ['DL', 'DR']],
  ['R', ['UR', 'DR']],
  ['L', ['UL', 'DL']],
  ['UL', ['UL']],
  ['UR', ['UR']],
  ['DL', ['DL']],
  ['DR', ['DR']],
]
const same = (a: Pin[], b: Pin[]) => a.length === b.length && a.every((p) => b.includes(p))

export function pinsName(pins: Pin[]) {
  return NAMES.find(([, ps]) => same(ps, pins))?.[0] ?? PINS.filter((p) => pins.includes(p)).join('·')
}

export function amountLabel(a: number) {
  const n = ((a % 12) + 12) % 12
  const v = n > 6 ? n - 12 : n
  return v < 0 ? `${-v}-` : `${v}+`
}

/**
 * Label a turn in competition notation. `view` is the side being looked at when it happened;
 * a turn of the other side is written from the side it happened on.
 */
export function clockLabel(m: ClockMove) {
  return m.kind === 'flip' ? 'y2' : `${pinsName(m.pins)}${amountLabel(m.amount)}`
}

/**
 * Parse competition notation ("UR3+ U4- ALL2+ y2 R1- ... UR DL"). Moves start on the front;
 * y2 flips to the back. Bare pin names at the end only say where the pins finish, so they're skipped.
 */
export function parseClock(text: string, start: Side = 'front'): ClockMove[] | null {
  const out: ClockMove[] = []
  let side = start
  for (const tok of text.trim().split(/\s+/).filter(Boolean)) {
    if (tok === 'y2' || tok === 'x2' || tok === 'z2') {
      out.push({ kind: 'flip' })
      side = otherSide(side)
      continue
    }
    const m = /^(ALL|UL|UR|DL|DR|U|D|L|R)(\d+)([+-])$/.exec(tok)
    if (m) {
      const pins = NAMES.find(([n]) => n === m[1])![1]
      out.push({ kind: 'turn', side, pins: [...pins], amount: Number(m[2]) * (m[3] === '-' ? -1 : 1) })
      continue
    }
    if (/^(UL|UR|DL|DR)$/.test(tok)) continue
    return null
  }
  return out
}

/** official-style random scramble */
export function clockScramble(rnd: () => number = Math.random): ClockMove[] {
  const x = () => Math.floor(rnd() * 12) - 5
  const front: Pin[][] = [['UR'], ['DR'], ['DL'], ['UL'], ['UL', 'UR'], ['UR', 'DR'], ['DL', 'DR'], ['UL', 'DL'], ['UL', 'UR', 'DL', 'DR']]
  const back: Pin[][] = [['UL', 'UR'], ['UR', 'DR'], ['DL', 'DR'], ['UL', 'DL'], ['UL', 'UR', 'DL', 'DR']]
  return [
    ...front.map((pins): ClockMove => ({ kind: 'turn', side: 'front', pins, amount: x() })),
    { kind: 'flip' },
    ...back.map((pins): ClockMove => ({ kind: 'turn', side: 'back', pins, amount: x() })),
  ]
}

export function formatClock(moves: ClockMove[], rnd: () => number = Math.random) {
  const tail = PINS.filter(() => rnd() < 0.5)
  return [...moves.map(clockLabel), ...tail].join(' ')
}

export function invertClockMove(m: ClockMove): ClockMove {
  return m.kind === 'flip' ? m : { ...m, amount: -m.amount }
}
