import { createCube, cloneState, applyMove, parseMoves, invertAlg, type CubeState } from '../src/cube/engine.ts'
import { writeFileSync } from 'node:fs'

const AUF = ['', 'U', "U'", 'U2']
const TRIG = ["R U R'", "R U' R'", "R U2 R'", "F' U F", "F' U' F", "F' U2 F", "R' F R F'", "F R' F' R"]
const BLOCKS: string[] = []
for (const a of AUF) for (const t of TRIG) BLOCKS.push((a + ' ' + t).trim())
const INV = BLOCKS.map(b => parseMoves(invertAlg(b)))

const CORNER = [2, -2, 2].join(), EDGE = [2, 0, 2].join()
const solved = createCube(3)
const homeKey = (c: { home: number[] }) => c.home.join()
function okOthers(s: CubeState) {
  // cross + other 3 slots solved: every non-top cubie except FR pair must be home with identity rotation
  for (const c of s.cubies) {
    const k = homeKey(c)
    if (c.home[1] > 0 || k === CORNER || k === EDGE) continue
    if (c.pos.join() !== k || c.rot.join() !== '1,0,0,0,1,0,0,0,1') return false
  }
  return true
}
const uMoves = [[], parseMoves('U'), parseMoves('U2'), parseMoves("U'")]
function caseKey(s: CubeState) {
  let best = ''
  for (const um of uMoves) {
    const t = cloneState(s); um.forEach(m => applyMove(t, m))
    const parts = t.cubies.filter(c => [CORNER, EDGE].includes(homeKey(c))).map(c => c.pos.join() + '|' + c.rot.join())
    const k = parts.join('#')
    if (!best || k < best) best = k
  }
  return best
}
const solvedKey = caseKey(solved)
const len = (a: string) => a.split(' ').filter(Boolean).length
const fCount = (a: string) => (a.match(/F/g) ?? []).length
const best = new Map<string, string>()
function consider(path: number[], s: CubeState) {
  if (!okOthers(s)) return
  const key = caseKey(s)
  if (key === solvedKey) return
  // solving alg = blocks in reverse order, strip leading AUF
  let alg = path.slice().reverse().map(i => BLOCKS[i]).join(' ').replace(/^U[2']? /, '')
  // merge consecutive U turns e.g. "U U" -> "U2"
  const prev = best.get(key)
  const score = (a: string) => len(a) * 10 + fCount(a)
  if (!prev || score(alg) < score(prev)) best.set(key, alg)
}
function dfs(s: CubeState, path: number[], depth: number) {
  if (path.length) consider(path, s)
  if (path.length === depth) return
  for (let i = 0; i < BLOCKS.length; i++) {
    const t = cloneState(s); INV[i].forEach(m => applyMove(t, m))
    path.push(i); dfs(t, path, depth); path.pop()
  }
}
dfs(solved, [], 3)
console.log('cases after depth 3:', best.size)
// classify
const out = [...best.entries()].map(([key, alg]) => {
  const s = createCube(3); parseMoves(invertAlg(alg)).forEach(m => applyMove(s, m))
  const corner = s.cubies.find(c => homeKey(c) === CORNER)!, edge = s.cubies.find(c => homeKey(c) === EDGE)!
  const cTop = corner.pos[1] > 0, eTop = edge.pos[1] > 0
  const group = cTop && eTop ? (len(alg) <= 4 ? 'basic' : 'top') : !cTop && eTop ? 'cornerSlot' : cTop ? 'edgeSlot' : 'bothSlot'
  return { group, alg }
})
const order = ['basic', 'top', 'cornerSlot', 'edgeSlot', 'bothSlot']
out.sort((a, b) => order.indexOf(a.group) - order.indexOf(b.group) || len(a.alg) - len(b.alg) || fCount(a.alg) - fCount(b.alg))
const counts: Record<string, number> = {}; out.forEach(o => counts[o.group] = (counts[o.group] ?? 0) + 1)
console.log(counts)
writeFileSync('scripts/f2l.json', JSON.stringify(out, null, 1))
