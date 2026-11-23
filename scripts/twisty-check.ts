import { applyMoves, formatMoves, invertMoves, isSolved, moveLabel, parseTwisty, randomScramble, solvedState, turnPieces } from '../src/puzzles/twisty.ts'
import { TWISTY_DEFS } from '../src/puzzles/defs.ts'
import { applyClockMoves, clockScramble, formatClock, invertClockMove, isClockSolved, parseClock, solvedClock, wheelTurn } from '../src/puzzles/clock.ts'

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

const G = TWISTY_DEFS.megaminx
const g0 = solvedState(G)
const grun = (alg: string) => applyMoves(G, g0, parseTwisty(G, alg)!)
const faceNames = ['U', 'F', 'R', 'BR', 'BL', 'L', 'DR', 'DBR', 'B', 'DBL', 'DL', 'D']
chk('megaminx: 62 pieces, 132 stickers', G.pieces.length === 62 && G.pieces.reduce((a, p) => a + p.faces.length, 0) === 132)
chk('megaminx: every face turn moves 11 pieces', faceNames.every((f) => turnPieces(G, g0, f).length === 11))
chk('megaminx: wide turns move all but one face', turnPieces(G, g0, 'Rw').length === 51 && turnPieces(G, g0, 'Dw').length === 51)
chk('megaminx: U is on top', Math.abs(G.turns.U.axis[1] - 1) < 1e-9)
chk('megaminx: F faces the viewer', Math.abs(G.turns.F.axis[0]) < 1e-9 && G.turns.F.axis[2] > 0.8)
chk('megaminx: D++ leaves the U layer alone', (() => {
  const s = grun('D++')
  return turnPieces(G, g0, 'U').every((i) => s[i].equals(g0[i]))
})())
chk('megaminx: R++ prints and parses as the wide turn', moveLabel(G, { turn: 'Rw', amount: 2 }) === 'R++' && parseTwisty(G, 'R++')![0].turn === 'Rw')
chk('megaminx: face doubles print as R2', moveLabel(G, { turn: 'R', amount: 2 }) === 'R2' && parseTwisty(G, "R2'")![0].amount === -2)
chk("megaminx: R U R' U' not solved", !isSolved(G, grun("R U R' U'")))
chk('megaminx: R++ then opposite DBL face back is a whole rotation', isSolved(G, grun("R++ DBL2'")))

const Q = TWISTY_DEFS.square1
const q0 = solvedState(Q)
const qrun = (alg: string) => applyMoves(Q, q0, parseTwisty(Q, alg)!)
const slash = { turn: '/', amount: 1 }
chk('square-1: 18 pieces', Q.pieces.length === 18)
chk('square-1: slice works on the solved cube', Q.legal!(q0, slash))
chk('square-1: (1,0)/ and (0,-1)/ are legal from cube shape, (-1,0)/ is not', Q.legal!(qrun('(1,0)'), slash) && Q.legal!(qrun('(0,-1)'), slash) && !Q.legal!(qrun('(-1,0)'), slash))
chk('square-1: slice is fine after (3,0) and (0,-3)', Q.legal!(qrun('(3,0)'), slash) && Q.legal!(qrun('(0,-3)'), slash))
chk('square-1: (2,0)/ is blocked, (1,-1)/ is not', !Q.legal!(qrun('(2,0)'), slash) && Q.legal!(qrun('(1,-1)'), slash))
chk('square-1: slice turns 6 top/bottom pieces and a middle half', turnPieces(Q, q0, '/').length === 9)
chk('square-1: U turns the top 8 only', turnPieces(Q, q0, 'U').length === 8)
chk('square-1: (1,0)/ (-3,3)/ round-trips through the formatter', formatMoves(Q, parseTwisty(Q, '(1,0)/ (-3,3)/')!) === '(1,0)/ (-3,3)/')
chk('square-1: scrambles have 12 slices and every slice is legal', (() => {
  for (let i = 0; i < 30; i++) {
    let s = q0
    let n = 0
    for (const m of randomScramble(Q)) {
      if (!Q.legal!(s, m)) return false
      if (m.turn === '/') n++
      s = applyMoves(Q, s, [m])
    }
    if (n !== 12) return false
  }
  return true
})())
chk('square-1: / / is solved, / alone is not', isSolved(Q, qrun('/ /')) && !isSolved(Q, qrun('/')))

{
  const c0 = solvedClock()
  const run = (alg: string) => applyClockMoves(c0, parseClock(alg)!)
  const up = { UL: true, UR: false, DL: false, DR: true }
  chk('clock: solved at start', isClockSolved(c0))
  chk('clock: U1+ moves 6 front dials and 2 back corners', (() => {
    const s = run('U1+')
    return s.front.filter((v) => v).length === 6 && s.back.filter((v) => v).length === 2 && s.back[0] === -1 && s.back[2] === -1
  })())
  chk('clock: ALL12+ is solved, ALL1+ is not', isClockSolved(run('ALL12+')) && !isClockSolved(run('ALL1+')))
  chk('clock: the same wheel seen from either side does the same thing', (() => {
    const a = applyClockMoves(c0, [wheelTurn('front', up, 'UL', -1)])
    const b = applyClockMoves(c0, [wheelTurn('back', up, 'UR', 1)])
    return JSON.stringify(a) === JSON.stringify(b)
  })())
  chk('clock: a wheel whose pin is down turns the back', wheelTurn('front', up, 'UR', 1).side === 'back')
  for (let i = 0; i < 10; i++) {
    const sc = clockScramble()
    const text = formatClock(sc)
    const parsed = parseClock(text)
    const s = applyClockMoves(c0, sc)
    const ok = !!parsed && JSON.stringify(applyClockMoves(c0, parsed)) === JSON.stringify(s) && isClockSolved(applyClockMoves(s, [...sc].reverse().map(invertClockMove)))
    if (i === 0) console.log('     clock scramble:', text)
    chk(`clock: scramble ${i} parses back and undoes`, ok)
  }
  chk('clock: rejects junk', parseClock('UR3 Q') === null)
}

if (failed) {
  console.log(`${failed} check(s) failed`)
  process.exit(1)
}
console.log('all twisty checks passed')
