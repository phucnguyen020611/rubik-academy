import { stateFromAlg, toFacelets, randomScramble } from '../src/cube/engine.ts'
import { validateFacelets, classify, hexToOklab, matchPalette, toFaceletString, FACE_ORDER, type Lab } from '../src/cube/scan.ts'

let ok = 0
for (let i = 0; i < 300; i++) if (validateFacelets(toFacelets(stateFromAlg(3, randomScramble(3)))) === null) ok++
console.log('valid scrambles', ok, '/ 300')

const f = toFacelets(stateFromAlg(3, "R U F' L2 D B"))
const set = (s: string, i: number, c: string) => s.slice(0, i) + c + s.slice(i + 1)
const swap = (s: string, i: number, j: number) => set(set(s, i, s[j]), j, s[i])
// twist corner URF (8,9,20) in place
const twisted = set(set(set(f, 8, f[9]), 9, f[20]), 20, f[8])
const flipped = swap(f, 5, 10)
// swap two whole edges UR <-> UF
const swapped = swap(swap(f, 5, 7), 10, 19)
console.log('twist ->', validateFacelets(twisted)?.kind, '| flip ->', validateFacelets(flipped)?.kind, '| parity ->', validateFacelets(swapped)?.kind, '| bad sticker ->', validateFacelets(swap(f, 0, 4 + 9))?.kind)

// classification: simulated camera colours with a warm cast, dim light and noise
const PAL = ['#f5f6f1', '#ffd60a', '#00a35c', '#0a5bd6', '#d7263d', '#ff7a00']
const palLab = PAL.map(hexToOklab)
const realCam: Lab[] = [[0.86, -0.005, 0.03], [0.82, 0.0, 0.14], [0.58, -0.12, 0.05], [0.48, -0.03, -0.13], [0.55, 0.15, 0.07], [0.66, 0.09, 0.12]]
let total = 0, right = 0
for (let trial = 0; trial < 200; trial++) {
  const fs = toFacelets(stateFromAlg(3, randomScramble(3)))
  const letters = [...fs]
  // standard scheme: U white, R red, F green, D yellow, L orange, B blue -> palette index
  const pal: Record<string, number> = { U: 0, D: 1, F: 2, B: 3, R: 4, L: 5 }
  const dim = 0.75 + Math.random() * 0.3
  const warm = (Math.random() - 0.3) * 0.04
  const colours: Lab[] = letters.map((l, i) => {
    const c = realCam[pal[l]]
    const faceDim = dim * (0.9 + 0.2 * Math.random() * (Math.floor(i / 9) % 2))
    return [c[0] * faceDim + (Math.random() - 0.5) * 0.06, c[1] + (Math.random() - 0.5) * 0.035, c[2] + warm + (Math.random() - 0.5) * 0.035]
  })
  const cl = classify(colours)
  const m = matchPalette(cl.means, palLab)
  const got = toFaceletString(cl.cluster.map((k) => m[k]))
  total += 54
  if (got) for (let i = 0; i < 54; i++) if (got[i] === fs[i]) right++
  if (got && validateFacelets(got) !== null && got === fs) console.log('?')
}
console.log('classification accuracy', ((right / total) * 100).toFixed(2) + '%', FACE_ORDER.join(''))
