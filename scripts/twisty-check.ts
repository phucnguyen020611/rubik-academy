import { applyMoves, invertMoves, isSolved, moveLabel, parseTwisty, randomScramble, solvedState, turnPieces } from '../src/puzzles/twisty.ts'
import { TWISTY_DEFS } from '../src/puzzles/defs.ts'

let failed = 0
const chk = (name: string, ok: boolean) => {
  if (!ok) failed++
  console.log(ok ? 'ok  ' : 'FAIL', name)
}

for (const def of Object.values(TWISTY_DEFS)) {
  const s0 = solvedState(def)
  const run = (alg: string) => applyMoves(def, s0, parseTwisty(def, alg)!)
  chk(`${def.id}: solved at start`, isSolved(def, s0))
  for (const [name, t] of Object.entries(def.turns)) {
    chk(`${def.id}: ${name} x${t.order} is identity`, isSolved(def, run(Array(t.order).fill(name).join(' '))))
    if (t.min > -50) chk(`${def.id}: ${name} changes the puzzle`, !isSolved(def, run(name)))
    chk(`${def.id}: ${name} moves pieces`, turnPieces(def, s0, name).length > 0)
  }
  for (let i = 0; i < 20; i++) {
    const sc = randomScramble(def)
    const s = applyMoves(def, s0, sc)
    if (i === 0) console.log('     scramble:', sc.map((m) => moveLabel(def, m)).join(' '))
    chk(`${def.id}: scramble ${i} undone by its inverse`, !isSolved(def, s) && isSolved(def, applyMoves(def, s, invertMoves(sc))))
  }
  const labels = randomScramble(def).map((m) => moveLabel(def, m)).join(' ')
  chk(`${def.id}: labels parse back`, parseTwisty(def, labels) !== null)
  chk(`${def.id}: rejects junk`, parseTwisty(def, 'R Q') === null)
}

const M = TWISTY_DEFS.mirror
const s0 = solvedState(M)
const run = (alg: string) => applyMoves(M, s0, parseTwisty(M, alg)!)
chk('mirror: whole-puzzle rotations still solved', isSolved(M, run('x y2 z')))
chk("mirror: (R U R' U')6", isSolved(M, run("R U R' U' R U R' U' R U R' U' R U R' U' R U R' U' R U R' U'")))
chk("mirror: x = R M' L'", isSolved(M, applyMoves(M, run("R M' L'"), parseTwisty(M, "x'")!)))
chk('mirror: superflip-ish not solved', !isSolved(M, run('M2 E2 S2')))

const P = TWISTY_DEFS.pyraminx
const p0 = solvedState(P)
const prun = (alg: string) => applyMoves(P, p0, parseTwisty(P, alg)!)
chk('pyraminx: 14 pieces, 36 stickers', P.pieces.length === 14 && P.pieces.reduce((a, p) => a + p.faces.length, 0) === 36)
chk('pyraminx: tip turns move one piece', ['u', 'l', 'r', 'b'].every((t) => turnPieces(P, p0, t).length === 1))
chk('pyraminx: layer turns move tip, centre and 3 edges', ['U', 'L', 'R', 'B'].every((t) => turnPieces(P, p0, t).length === 5))
chk("pyraminx: R U R' U' is not solved", !isSolved(P, prun("R U R' U'")))
chk('pyraminx: tips alone scramble only tips', !isSolved(P, prun('u')) && isSolved(P, prun("u u'")))

const S = TWISTY_DEFS.skewb
const k0 = solvedState(S)
const krun = (alg: string) => applyMoves(S, k0, parseTwisty(S, alg)!)
chk('skewb: 14 pieces, 30 stickers', S.pieces.length === 14 && S.pieces.reduce((a, p) => a + p.faces.length, 0) === 30)
chk('skewb: every corner turn moves half the puzzle', ['R', 'U', 'L', 'B', 'UFR', 'UFL', 'UBR', 'DFR'].every((t) => turnPieces(S, k0, t).length === 7))
chk("skewb: R then opposite corner UFL' is a whole-puzzle rotation", isSolved(S, krun("R UFL'")))
chk("skewb: R U' is not solved", !isSolved(S, krun("R U'")))
chk('skewb: UFR parses before U', parseTwisty(S, "UFR' U")?.[0].turn === 'UFR')

if (failed) {
  console.log(`${failed} check(s) failed`)
  process.exit(1)
}
console.log('all twisty checks passed')
