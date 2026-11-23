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

if (failed) {
  console.log(`${failed} check(s) failed`)
  process.exit(1)
}
console.log('all twisty checks passed')
