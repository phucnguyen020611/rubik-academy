import { stateFromAlg, toFacelets, randomScramble } from '../src/cube/engine.ts'
import { classify, matchPalette, hexToOklab, stickerColour, toFaceletString, validateFacelets, rgbToOklab, type Lab } from '../src/cube/scan.ts'
// same geometry as Scan.tsx
const SIZE = 480, GUIDE = SIZE * 0.72, CELL = GUIDE / 3, G0 = (SIZE - GUIDE) / 2
const idxs = (cx: number, cy: number, h: number) => { const o: number[] = []; for (let y = Math.round(cy - h); y <= cy + h; y += 2) for (let x = Math.round(cx - h); x <= cx + h; x += 2) o.push((y * SIZE + x) * 4); return o }
const CELL_IDX = Array.from({ length: 9 }, (_, i) => idxs(G0 + (i % 3) * CELL + CELL / 2, G0 + Math.floor(i / 3) * CELL + CELL / 2, CELL * 0.2))
const LINE_IDX: number[] = []; for (const k of [1, 2]) for (let t = G0 + 6; t < G0 + GUIDE - 6; t += 4) { const a = Math.round(G0 + k * CELL); LINE_IDX.push((Math.round(t) * SIZE + a) * 4, (a * SIZE + Math.round(t)) * 4) }
// photographed sticker colours (typical phone camera, slightly off the ideal hex)
const CAM: Record<string, number[]> = { U: [225, 226, 218], D: [238, 205, 40], F: [20, 160, 90], B: [25, 85, 190], R: [200, 35, 50], L: [240, 110, 25] }
const PAL = ['#f5f6f1', '#ffd60a', '#00a35c', '#0a5bd6', '#d7263d', '#ff7a00'].map(hexToOklab)
let right = 0, total = 0, valid = 0, cubeLike = 0
for (let trial = 0; trial < 60; trial++) {
  const f = toFacelets(stateFromAlg(3, randomScramble(3)))
  const tint = [1 + (Math.random() - 0.5) * 0.15, 1, 1 - Math.random() * 0.2] // warm light
  const colours: Lab[] = []
  for (let face = 0; face < 6; face++) {
    const bright = 0.7 + Math.random() * 0.35
    const px = new Uint8ClampedArray(SIZE * SIZE * 4)
    for (let y = 0; y < SIZE; y++) for (let x = 0; x < SIZE; x++) {
      const p = (y * SIZE + x) * 4
      const gx = (x - G0) / CELL, gy = (y - G0) / CELL
      const inGrid = gx >= 0 && gx < 3 && gy >= 0 && gy < 3
      const fx = gx - Math.floor(gx), fy = gy - Math.floor(gy)
      let c = [30, 30, 32] // body / background
      if (inGrid && fx > 0.08 && fx < 0.92 && fy > 0.08 && fy < 0.92) c = CAM[f[face * 9 + Math.floor(gy) * 3 + Math.floor(gx)]]
      // glare blob on some stickers
      const glare = inGrid && fx > 0.3 && fx < 0.45 && fy > 0.25 && fy < 0.35 && (Math.floor(gx) + Math.floor(gy)) % 2 === 0
      for (let k = 0; k < 3; k++) px[p + k] = glare ? 255 : c[k] * bright * tint[k] + (Math.random() - 0.5) * 30
      px[p + 3] = 255
    }
    const cols = CELL_IDX.map((i) => stickerColour(px, i)!)
    let lineL = 0; for (const i of LINE_IDX) lineL += rgbToOklab(px[i], px[i + 1], px[i + 2])[0]; lineL /= LINE_IDX.length
    if (cols.reduce((a, c) => a + c[0], 0) / 9 - lineL > 0.12) cubeLike++
    colours.push(...cols)
  }
  const cl = classify(colours); const m = matchPalette(cl.means, PAL)
  const pal: Record<string, number> = { U: 0, D: 1, F: 2, B: 3, R: 4, L: 5 }
  const got = toFaceletString(cl.cluster.map((k) => m[k]))
  if (got && validateFacelets(got) === null) valid++
  cl.cluster.forEach((k, i) => { total++; if (m[k] === pal[f[i]]) right++ })
}
console.log('sticker accuracy', ((right / total) * 100).toFixed(2) + '%', '| valid cubes', valid, '/ 60', '| frames detected as cube', cubeLike, '/ 360')
