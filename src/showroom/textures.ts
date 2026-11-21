import * as THREE from 'three'

const cache = new Map<string, THREE.Texture>()

function canvas(w: number, h: number) {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  return [c, c.getContext('2d')!] as const
}

function finish(c: HTMLCanvasElement, srgb = true) {
  const t = new THREE.CanvasTexture(c)
  if (srgb) t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = 8
  return t
}

/** Pale birch plywood with fine grain. */
export function woodTexture(tone: 'birch' | 'walnut' = 'birch') {
  const key = `wood-${tone}`
  if (cache.has(key)) return cache.get(key)!
  const [c, g] = canvas(512, 512)
  const base = tone === 'birch' ? [222, 196, 156] : [92, 58, 34]
  g.fillStyle = `rgb(${base})`
  g.fillRect(0, 0, 512, 512)
  let seed = tone === 'birch' ? 7 : 13
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
  for (let i = 0; i < 260; i++) {
    const y = rnd() * 512
    const amp = 2 + rnd() * 5
    const dark = rnd() * 0.16
    g.strokeStyle = `rgba(${tone === 'birch' ? '120,80,40' : '30,15,5'},${dark})`
    g.lineWidth = 0.6 + rnd() * 1.8
    g.beginPath()
    for (let x = 0; x <= 512; x += 16) g.lineTo(x, y + Math.sin(x / (40 + rnd() * 30) + i) * amp)
    g.stroke()
  }
  const t = finish(c)
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  cache.set(key, t)
  return t
}

/** Very subtle plaster noise for walls. */
export function plasterTexture() {
  const key = 'plaster'
  if (cache.has(key)) return cache.get(key)!
  const [c, g] = canvas(256, 256)
  const img = g.createImageData(256, 256)
  for (let i = 0; i < img.data.length; i += 4) {
    const v = 236 + Math.random() * 19
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v
    img.data[i + 3] = 255
  }
  g.putImageData(img, 0, 0)
  const t = finish(c, false)
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  t.repeat.set(6, 3)
  cache.set(key, t)
  return t
}

function roundRect(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  g.beginPath()
  g.moveTo(x + r, y)
  g.arcTo(x + w, y, x + w, y + h, r)
  g.arcTo(x + w, y + h, x, y + h, r)
  g.arcTo(x, y + h, x, y, r)
  g.arcTo(x, y, x + w, y, r)
  g.closePath()
}

export interface PosterSpec {
  key: string
  eyebrow: string
  title: string
  subtitle: string
  bg: string
  ink: string
  art: 'beginner' | 'cfop' | 'iceberg' | 'trainer'
}

const Y = '#ffd60a'
const W_ = '#f5f6f1'
const G = '#00a35c'
const B = '#0a5bd6'
const R = '#d7263d'
const O = '#ff7a00'
const GREY = '#3a3f3c'

function plate(g: CanvasRenderingContext2D, x: number, y: number, size: number) {
  g.save()
  g.shadowColor = 'rgba(0,0,0,0.28)'
  g.shadowBlur = 30
  g.shadowOffsetY = 14
  g.fillStyle = '#141715'
  roundRect(g, x, y, size, size, size * 0.09)
  g.fill()
  g.restore()
}

function face(g: CanvasRenderingContext2D, cx: number, cy: number, size: number, colours: string[], sides?: string[][]) {
  const pad = size * 0.06
  const gap = size * 0.035
  const cell = (size - pad * 2 - gap * 2) / 3
  const x0 = cx - size / 2
  const y0 = cy - size / 2
  plate(g, x0, y0, size)
  colours.forEach((c, i) => {
    const r = Math.floor(i / 3)
    const col = i % 3
    g.fillStyle = c
    roundRect(g, x0 + pad + col * (cell + gap), y0 + pad + r * (cell + gap), cell, cell, cell * 0.16)
    g.fill()
    g.fillStyle = 'rgba(255,255,255,0.16)'
    roundRect(g, x0 + pad + col * (cell + gap) + cell * 0.1, y0 + pad + r * (cell + gap) + cell * 0.08, cell * 0.8, cell * 0.22, cell * 0.1)
    g.fill()
  })
  if (sides) {
    // top, right, bottom, left strips
    const s = size * 0.075
    const off = size / 2 + size * 0.045
    sides.forEach((row, k) => {
      row.forEach((c, j) => {
        g.fillStyle = c
        const along = -size / 2 + pad + j * (cell + gap)
        let x = 0
        let y = 0
        let w = cell
        let h = s
        if (k === 0) [x, y] = [cx + along, cy - off - s]
        if (k === 2) [x, y] = [cx + along, cy + off]
        if (k === 1) [x, y, w, h] = [cx + off, cy + along, s, cell]
        if (k === 3) [x, y, w, h] = [cx - off - s, cy + along, s, cell]
        roundRect(g, x, y, w, h, s * 0.3)
        g.fill()
      })
    })
  }
}

function arrow(g: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, both = false) {
  const head = (fx: number, fy: number, tx: number, ty: number) => {
    const a = Math.atan2(ty - fy, tx - fx)
    g.beginPath()
    g.moveTo(tx, ty)
    g.lineTo(tx - 22 * Math.cos(a - 0.5), ty - 22 * Math.sin(a - 0.5))
    g.lineTo(tx - 22 * Math.cos(a + 0.5), ty - 22 * Math.sin(a + 0.5))
    g.closePath()
    g.fill()
  }
  g.beginPath()
  g.moveTo(x1, y1)
  g.lineTo(x2, y2)
  g.stroke()
  head(x1, y1, x2, y2)
  if (both) head(x2, y2, x1, y1)
}

/** Framed learning poster, drawn with the site's fonts. */
export function posterTexture(p: PosterSpec) {
  if (cache.has(p.key)) return cache.get(p.key)!
  const Wd = 768
  const H = 1024
  const [c, g] = canvas(Wd, H)
  g.fillStyle = p.bg
  g.fillRect(0, 0, Wd, H)
  // faint grid texture
  g.strokeStyle = p.ink === '#ffffff' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.045)'
  g.lineWidth = 2
  for (let i = 48; i < Wd; i += 48) {
    g.beginPath()
    g.moveTo(i, 0)
    g.lineTo(i, H)
    g.stroke()
  }
  for (let i = 48; i < H; i += 48) {
    g.beginPath()
    g.moveTo(0, i)
    g.lineTo(Wd, i)
    g.stroke()
  }
  const cx = Wd / 2
  const cy = 430
  if (p.art === 'beginner') {
    face(g, cx, cy, 380, [GREY, W_, GREY, W_, W_, W_, GREY, W_, GREY])
  } else if (p.art === 'cfop') {
    face(g, cx, cy, 340, [Y, Y, Y, Y, Y, Y, Y, Y, Y], [[B, O, B], [R, R, O], [G, B, G], [O, G, R]])
  } else if (p.art === 'trainer') {
    face(g, cx, cy, 340, [Y, Y, Y, Y, Y, Y, Y, Y, Y], [[B, B, B], [R, O, O], [G, G, G], [O, R, R]])
    g.strokeStyle = '#141715'
    g.fillStyle = '#141715'
    g.lineWidth = 9
    g.lineCap = 'round'
    arrow(g, cx - 95, cy, cx + 85, cy, true)
    arrow(g, cx + 105, cy - 105, cx + 105, cy + 85, true)
  } else {
    // iceberg: sky, waterline, berg
    g.fillStyle = 'rgba(255,255,255,0.95)'
    g.beginPath()
    g.moveTo(cx - 70, cy - 110)
    g.lineTo(cx + 10, cy - 200)
    g.lineTo(cx + 60, cy - 150)
    g.lineTo(cx + 120, cy - 60)
    g.lineTo(cx - 150, cy - 60)
    g.closePath()
    g.fill()
    g.fillStyle = 'rgba(170,225,255,0.45)'
    g.beginPath()
    g.moveTo(cx - 190, cy - 60)
    g.lineTo(cx + 190, cy - 60)
    g.lineTo(cx + 150, cy + 90)
    g.lineTo(cx + 40, cy + 230)
    g.lineTo(cx - 80, cy + 180)
    g.lineTo(cx - 170, cy + 50)
    g.closePath()
    g.fill()
    g.strokeStyle = 'rgba(255,255,255,0.7)'
    g.lineWidth = 4
    g.beginPath()
    g.moveTo(60, cy - 60)
    g.lineTo(Wd - 60, cy - 60)
    g.stroke()
    const dots = [
      [cx - 20, cy - 10],
      [cx + 60, cy + 40],
      [cx - 70, cy + 70],
      [cx + 20, cy + 130],
    ]
    dots.forEach(([x, y], i) => {
      g.fillStyle = [Y, G, R, O][i]
      roundRect(g, x - 16, y - 16, 32, 32, 7)
      g.fill()
    })
  }
  g.fillStyle = p.ink
  g.globalAlpha = 0.7
  g.font = '700 30px "Plus Jakarta Sans", sans-serif'
  g.textBaseline = 'alphabetic'
  ;(g as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = '4px'
  g.fillText(p.eyebrow.toUpperCase(), 64, 96)
  ;(g as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = '0px'
  g.globalAlpha = 1
  let size = 104
  g.font = `800 ${size}px "Bricolage Grotesque", sans-serif`
  while (g.measureText(p.title).width > Wd - 128 && size > 60) {
    size -= 4
    g.font = `800 ${size}px "Bricolage Grotesque", sans-serif`
  }
  g.fillText(p.title, 60, 850)
  g.globalAlpha = 0.78
  g.font = '500 34px "Plus Jakarta Sans", sans-serif'
  g.fillText(p.subtitle, 64, 912)
  g.globalAlpha = 1
  const t = finish(c)
  cache.set(p.key, t)
  return t
}

/** Emissive text sign (neon / LCD). */
export function signTexture(key: string, text: string, opts: { font?: string; color?: string; w?: number; h?: number; glow?: number; bg?: string } = {}) {
  if (cache.has(key)) return cache.get(key)!
  const W = opts.w ?? 1024
  const H = opts.h ?? 256
  const [c, g] = canvas(W, H)
  if (opts.bg) {
    g.fillStyle = opts.bg
    g.fillRect(0, 0, W, H)
  }
  let font = opts.font ?? '800 120px "Bricolage Grotesque", sans-serif'
  g.font = font
  const pad = (opts.glow ?? 30) * 1.6 + 24
  const wText = g.measureText(text).width
  if (wText > W - pad * 2) {
    const px = parseFloat(/(\d+)px/.exec(font)![1])
    font = font.replace(/\d+px/, `${Math.floor((px * (W - pad * 2)) / wText)}px`)
    g.font = font
  }
  g.textAlign = 'center'
  g.textBaseline = 'middle'
  g.shadowColor = opts.color ?? '#7dffb0'
  g.shadowBlur = opts.glow ?? 30
  g.fillStyle = opts.color ?? '#b8ffd2'
  g.fillText(text, W / 2, H / 2 + 6)
  g.shadowBlur = 0
  g.fillText(text, W / 2, H / 2 + 6)
  const t = finish(c)
  cache.set(key, t)
  return t
}

export function clearTextureCache() {
  cache.forEach((t) => t.dispose())
  cache.clear()
}
