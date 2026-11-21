import { stateFromAlg, invertAlg, stickers, faceGrid, applyMoves, parseMoves, isSolved, type CubeState } from '../src/cube/engine.ts'
import { OLL } from '../src/data/oll.ts'
import { PLL } from '../src/data/pll.ts'

export function centreColour(s: CubeState) {
  const m: Record<string, string> = {}
  for (const f of ['U','D','F','B','R','L'] as const) m[f] = faceGrid(s, f)[1][1]
  return m
}
export function f2lSolved(s: CubeState) {
  const c = centreColour(s)
  return stickers(s).every(st => st.pos[1] > 0 || st.homeFace === c[st.face])
}
export function llInfo(s: CubeState) {
  const c = centreColour(s)
  const top = stickers(s).filter(st => st.face === 'U')
  let edges = 0, corners = 0
  for (const st of top) {
    if (st.homeFace !== c.U) continue
    const nz = (st.pos[0] !== 0 ? 1 : 0) + (st.pos[2] !== 0 ? 1 : 0)
    if (nz === 1) edges++; else if (nz === 2) corners++
  }
  return { edges, corners }
}
let bad = 0
for (const set of [OLL, PLL]) for (const c of set) {
  for (const alg of [c.alg, ...(c.alts ?? [])]) {
    const s = stateFromAlg(3, invertAlg(alg))
    const ok = f2lSolved(s)
    const info = llInfo(s)
    const back = isSolved(applyMoves(s, parseMoves(alg)))
    const isPll = c.id.startsWith('pll')
    const pllOk = !isPll || info.edges === 4 && info.corners === 4
    if (!ok || !back || !pllOk) { bad++; console.log('BAD', c.name, alg, { ok, back, info }) }
    else if (alg === c.alg && !isPll) process.stdout.write(`${c.name.replace('OLL ','')}:${c.group}:e${info.edges}c${info.corners}  `)
  }
}
console.log('\nbad =', bad)
