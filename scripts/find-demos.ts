import { stateFromAlg, invertAlg, parseAlg, applyMove, createCube, stickers, type CubeState } from '../src/cube/engine.ts'
// yellow-top lessons: home 'D' = white
const daisyCount = (s: CubeState) => stickers(s).filter(st => st.homeFace === 'D' && st.face === 'U' && (st.pos[0] === 0) !== (st.pos[2] === 0)).length
const crossOk = (s: CubeState) => stickers(s).filter(st => st.homeFace === 'D' && st.face === 'D' && (st.pos[0] === 0) !== (st.pos[2] === 0)).length === 4 &&
  s.cubies.filter(c => c.home[1] === -2 && ((c.home[0] === 0) !== (c.home[2] === 0))).every(c => c.pos.join() === c.home.join())
const DAISY = "F2 R2 B2 L2"
// daisy demo: random short algs, track monotonic daisy count
const MV = ["F", "F'", "F2", "R", "R'", "L", "L'", "B", "B'", "U", "U'", "U2"]
let found: string[] = []
for (let tries = 0; tries < 200000 && found.length < 5; tries++) {
  const len = 5 + Math.floor(Math.random() * 3)
  const alg = Array.from({ length: len }, () => MV[Math.floor(Math.random() * MV.length)]).join(' ')
  const s = stateFromAlg(3, DAISY + ' ' + invertAlg(alg))
  const counts = [daisyCount(s)]
  for (const t of parseAlg(alg)) { applyMove(s, t.move); counts.push(daisyCount(s)) }
  const toks = parseAlg(alg).map(t => t.text)
  let ok = counts[0] === 0 && counts[counts.length - 1] === 4
  for (let i = 1; i < counts.length && ok; i++) {
    const isU = toks[i - 1][0] === 'U'
    if (isU ? counts[i] !== counts[i - 1] : counts[i] !== counts[i - 1] + 1) ok = false
    if (isU && toks[i - 2]?.[0] === 'U') ok = false
  }
  if (ok && !found.includes(alg)) found.push(alg)
}
console.log('daisy', found)
// cross demo: (U^a X2) x4 from daisy
const AU = ['', 'U ', "U' ", 'U2 ']
const perms = [['F2', 'R2', 'B2', 'L2'], ['F2', 'L2', 'B2', 'R2'], ['R2', 'F2', 'L2', 'B2'], ['F2', 'B2', 'R2', 'L2']]
const cross: string[] = []
for (const p of perms) for (const a of AU) for (const b of AU) for (const c of AU) for (const d of AU) {
  const alg = `${a}${p[0]} ${b}${p[1]} ${c}${p[2]} ${d}${p[3]}`.replace(/\s+/g, ' ').trim()
  const pre = stateFromAlg(3, invertAlg(alg))
  if (daisyCount(pre) === 4 && [a, b, c, d].filter(x => x).length >= 3) cross.push(alg)
}
console.log('cross', cross.slice(0, 6), cross.length)
