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

export const TWISTY_DEFS: Record<string, TwistyDef> = {
  mirror: MIRROR,
}
