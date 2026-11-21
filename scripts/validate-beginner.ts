import { stateFromAlg, invertAlg, applyMoves, parseMoves, stickers, type CubeState } from '../src/cube/engine.ts'
import { BEGINNER } from '../src/data/beginner.ts'
const home = (s: CubeState, pred: (h: number[]) => boolean) => s.cubies.filter(c => pred(c.home)).every(c => c.pos.join() === c.home.join() && c.rot.join() === '1,0,0,0,1,0,0,0,1')
const isEdge = (h: number[]) => h.filter(v => v !== 0).length === 2
const info = (s: CubeState) => ({
  cross: home(s, h => h[1] === -2 && isEdge(h)),
  L1: home(s, h => h[1] === -2),
  f2l: home(s, h => h[1] <= 0),
  yE: stickers(s).filter(st => st.homeFace === 'U' && st.face === 'U' && isEdge(st.pos)).length,
  yC: stickers(s).filter(st => st.homeFace === 'U' && st.face === 'U' && st.pos.filter(v => v).length === 3).length,
  solved: home(s, () => true),
})
for (const st of BEGINNER) for (const d of st.demos) {
  const s = stateFromAlg(3, `${d.pre ?? ''} ${invertAlg(d.alg)}`)
  const a = info(s); applyMoves(s, parseMoves(d.alg)); const b = info(s)
  console.log(st.id.padEnd(15), d.title.vi.padEnd(26), JSON.stringify(a), '=>', JSON.stringify(b))
}
