import { createRequire } from 'node:module'
import { stateFromAlg, toFacelets, randomScramble, applyMoves, parseMoves, isSolved } from '../src/cube/engine.ts'
const Cube = createRequire(import.meta.url)('cubejs')
Cube.initSolver()
let ok = 0
for (let i = 0; i < 20; i++) {
  const scr = randomScramble(3) + (i % 3 === 0 ? ' x y' : '')
  const s = stateFromAlg(3, scr)
  const f = toFacelets(s)
  const c = Cube.fromString(f)
  const sol = c.solve()
  applyMoves(s, parseMoves(sol))
  if (isSolved(s)) ok++; else console.log('fail', scr, sol)
}
console.log('solved', ok, '/ 20')
