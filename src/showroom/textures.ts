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

// ------------------------------------------------------------------ speed timer
/** Seven-segment LCD read-out, dark digits on a grey-green panel with faint "off" segments. */
export function lcdTexture(text: string) {
  const key = `lcd7-${text}`
  if (cache.has(key)) return cache.get(key)!
  const W = 512
  const H = 192
  const [c, g] = canvas(W, H)
  const bg = g.createLinearGradient(0, 0, 0, H)
  bg.addColorStop(0, '#bcc7b4')
  bg.addColorStop(1, '#97a593')
  g.fillStyle = bg
  g.fillRect(0, 0, W, H)
  const SEG: Record<string, string> = {
    '0': 'abcdef', '1': 'bc', '2': 'abged', '3': 'abgcd', '4': 'fgbc', '5': 'afgcd', '6': 'afgedc', '7': 'abc', '8': 'abcdefg', '9': 'abcdfg',
  }
  const dh = 116
  const dw = 56
  const th = 11
  const y0 = (H - dh) / 2
  const digit = (x: number, ch: string) => {
    for (const s of 'abcdefg') {
      g.fillStyle = SEG[ch]?.includes(s) ? '#1c241f' : 'rgba(40,52,44,0.08)'
      const sk = 0.12 // italic slant
      const P = (px: number, py: number): [number, number] => [x + px + (dh - py) * sk, y0 + py]
      const bar = (pts: [number, number][]) => {
        g.beginPath()
        pts.forEach(([a, b], i) => (i ? g.lineTo(...P(a, b)) : g.moveTo(...P(a, b))))
        g.closePath()
        g.fill()
      }
      const h2 = dh / 2
      const hz = (yy: number) => bar([[th * 0.6, yy], [th * 1.1, yy - th / 2], [dw - th * 1.1, yy - th / 2], [dw - th * 0.6, yy], [dw - th * 1.1, yy + th / 2], [th * 1.1, yy + th / 2]])
      const vt = (xx: number, a: number, b: number) => bar([[xx, a + th * 0.6], [xx + th / 2, a + th * 1.1], [xx + th / 2, b - th * 1.1], [xx, b - th * 0.6], [xx - th / 2, b - th * 1.1], [xx - th / 2, a + th * 1.1]])
      if (s === 'a') hz(th / 2)
      if (s === 'g') hz(h2)
      if (s === 'd') hz(dh - th / 2)
      if (s === 'f') vt(th / 2, 0, h2)
      if (s === 'b') vt(dw - th / 2, 0, h2)
      if (s === 'e') vt(th / 2, h2, dh)
      if (s === 'c') vt(dw - th / 2, h2, dh)
    }
  }
  let x = 40
  for (const ch of text) {
    g.fillStyle = '#1c241f'
    if (ch === ':') {
      g.fillRect(x + 10, y0 + dh * 0.27, 11, 11)
      g.fillRect(x + 5, y0 + dh * 0.66, 11, 11)
      x += 30
    } else if (ch === '.') {
      g.fillRect(x + 2, y0 + dh - 11, 11, 11)
      x += 24
    } else {
      digit(x, ch)
      x += dw + 20
    }
  }
  const sh = g.createLinearGradient(0, 0, W, H)
  sh.addColorStop(0, 'rgba(255,255,255,0.22)')
  sh.addColorStop(0.45, 'rgba(255,255,255,0)')
  g.fillStyle = sh
  g.fillRect(0, 0, W, H)
  const t = finish(c)
  cache.set(key, t)
  return t
}

/** Rubber touch pad: near-black with a faint blue geometric pattern and a yellow palm badge. */
export function padTexture() {
  const key = 'timer-pad'
  if (cache.has(key)) return cache.get(key)!
  const W = 1024
  const H = 512
  const [c, g] = canvas(W, H)
  const bg = g.createRadialGradient(W * 0.55, H * 0.5, 40, W * 0.55, H * 0.5, W * 0.7)
  bg.addColorStop(0, '#1e2836')
  bg.addColorStop(1, '#0c1017')
  g.fillStyle = bg
  g.fillRect(0, 0, W, H)
  let seed = 11
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
  const R = 46
  const s3 = Math.sqrt(3)
  g.lineWidth = 2.2
  for (let row = -1; row < H / (R * 1.5) + 1; row++) {
    for (let col = -1; col < W / (R * s3) + 1; col++) {
      const cx = col * R * s3 + (row % 2 ? (R * s3) / 2 : 0)
      const cy = row * R * 1.5
      for (let i = 0; i < 6; i++) {
        if (rnd() < 0.3) continue
        const a0 = Math.PI / 6 + (i * Math.PI) / 3
        const a1 = a0 + Math.PI / 3
        g.strokeStyle = `rgba(70,150,235,${0.08 + rnd() * 0.24})`
        g.beginPath()
        g.moveTo(cx + R * Math.cos(a0), cy + R * Math.sin(a0))
        g.lineTo(cx + R * Math.cos(a1), cy + R * Math.sin(a1))
        g.stroke()
      }
    }
  }
  const bx = W * 0.56
  const by = H * 0.5
  const br = 118
  g.fillStyle = '#0a0d11'
  g.beginPath()
  g.arc(bx, by, br + 16, 0, Math.PI * 2)
  g.fill()
  g.strokeStyle = '#f4f1e6'
  g.lineWidth = 7
  g.beginPath()
  g.arc(bx, by, br, 0, Math.PI * 2)
  g.stroke()
  g.save()
  g.translate(bx + 6, by + 14)
  g.fillStyle = '#ffd21f'
  const finger = (x: number, top: number, w: number) => {
    roundRect(g, x - w / 2, top, w, 40 - top, w / 2)
    g.fill()
  }
  finger(-38, -66, 24)
  finger(-12, -84, 25)
  finger(14, -80, 25)
  finger(39, -60, 22)
  g.save()
  g.translate(-50, 30)
  g.rotate(-0.8)
  roundRect(g, -13, -64, 26, 74, 13)
  g.fill()
  g.restore()
  roundRect(g, -52, -14, 104, 86, 28)
  g.fill()
  // finger gaps
  g.strokeStyle = '#0a0d11'
  g.lineWidth = 4
  for (const x of [-25, 1, 27]) {
    g.beginPath()
    g.moveTo(x, -50)
    g.lineTo(x, -6)
    g.stroke()
  }
  g.restore()
  const t = finish(c)
  cache.set(key, t)
  return t
}

/** Brushed-silver control plate with LEDs, four buttons and a window for the LCD. */
export function faceplateTexture(brand: string) {
  const key = `timer-face-${brand}`
  if (cache.has(key)) return cache.get(key)!
  const W = 1024
  const H = 576
  const [c, g] = canvas(W, H)
  const m = g.createLinearGradient(0, 0, W, H)
  m.addColorStop(0, '#eef1f3')
  m.addColorStop(0.35, '#bfc6cc')
  m.addColorStop(0.6, '#e2e6ea')
  m.addColorStop(1, '#a0a8af')
  g.fillStyle = m
  g.fillRect(0, 0, W, H)
  let seed = 5
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
  for (let i = 0; i < 900; i++) {
    const y = rnd() * H
    g.strokeStyle = `rgba(${rnd() < 0.5 ? '255,255,255' : '60,66,72'},${0.04 + rnd() * 0.06})`
    g.lineWidth = 1
    g.beginPath()
    g.moveTo(0, y)
    g.lineTo(W, y + (rnd() - 0.5) * 4)
    g.stroke()
  }
  g.fillStyle = '#1d2227'
  roundRect(g, 292, 44, 440, 214, 24)
  g.fill()
  g.fillStyle = '#05080c'
  roundRect(g, 330, 316, 364, 96, 16)
  g.fill()
  g.fillStyle = '#7cc2ff'
  g.shadowColor = '#3fa0ff'
  g.shadowBlur = 16
  g.font = '800 40px "Bricolage Grotesque", sans-serif'
  g.textAlign = 'center'
  g.textBaseline = 'middle'
  g.fillText(brand, 512, 366)
  g.shadowBlur = 0
  const button = (x: number, y: number, r: number, ring: string, draw: () => void) => {
    g.fillStyle = 'rgba(0,0,0,0.25)'
    g.beginPath()
    g.arc(x + 3, y + 6, r + 4, 0, Math.PI * 2)
    g.fill()
    const gr = g.createRadialGradient(x - r * 0.3, y - r * 0.4, 2, x, y, r)
    gr.addColorStop(0, '#3c434b')
    gr.addColorStop(1, '#0b0e12')
    g.fillStyle = gr
    g.beginPath()
    g.arc(x, y, r, 0, Math.PI * 2)
    g.fill()
    g.strokeStyle = ring
    g.lineWidth = 6
    g.beginPath()
    g.arc(x, y, r - 9, 0, Math.PI * 2)
    g.stroke()
    g.save()
    g.translate(x, y)
    g.strokeStyle = ring
    g.fillStyle = ring
    g.lineWidth = 7
    g.lineCap = 'round'
    draw()
    g.restore()
  }
  for (const [x, y] of [
    [140, 104],
    [222, 124],
  ]) {
    g.fillStyle = '#4a5058'
    g.beginPath()
    g.arc(x, y, 25, 0, Math.PI * 2)
    g.fill()
    const gl = g.createRadialGradient(x - 6, y - 6, 1, x, y, 20)
    gl.addColorStop(0, '#ffffff')
    gl.addColorStop(1, '#c4ccd3')
    g.fillStyle = gl
    g.beginPath()
    g.arc(x, y, 19, 0, Math.PI * 2)
    g.fill()
  }
  button(170, 300, 64, '#38a8ff', () => {
    g.beginPath()
    g.arc(0, 4, 23, -Math.PI / 2 + 0.6, Math.PI * 1.5 - 0.6)
    g.stroke()
    g.beginPath()
    g.moveTo(0, -26)
    g.lineTo(0, 2)
    g.stroke()
  })
  button(856, 170, 50, '#f2f2f2', () => {
    g.beginPath()
    g.moveTo(-10, -17)
    g.lineTo(17, 0)
    g.lineTo(-10, 17)
    g.closePath()
    g.fill()
  })
  button(800, 316, 50, '#f2f2f2', () => {
    g.lineWidth = 5
    roundRect(g, -16, -16, 32, 32, 4)
    g.stroke()
    g.fillRect(-9, -16, 16, 10)
    g.fillRect(-9, 4, 18, 10)
  })
  button(868, 450, 60, '#ffd21f', () => {
    g.beginPath()
    g.arc(0, 0, 21, -Math.PI * 0.35, Math.PI * 1.4)
    g.stroke()
    g.beginPath()
    g.moveTo(9, -28)
    g.lineTo(22, -13)
    g.lineTo(4, -7)
    g.closePath()
    g.fill()
  })
  // rounded plate edge with a thin dark bevel line
  g.strokeStyle = 'rgba(20,24,28,0.55)'
  g.lineWidth = 6
  roundRect(g, 4, 4, W - 8, H - 8, 64)
  g.stroke()
  g.globalCompositeOperation = 'destination-in'
  roundRect(g, 1, 1, W - 2, H - 2, 66)
  g.fill()
  g.globalCompositeOperation = 'source-over'
  const t = finish(c)
  cache.set(key, t)
  return t
}

/** Nine dials on one side of a clock puzzle. */
export function clockFaceTexture() {
  const key = 'clock-face'
  if (cache.has(key)) return cache.get(key)!
  const S = 512
  const [c, g] = canvas(S, S)
  g.fillStyle = '#16243f'
  g.fillRect(0, 0, S, S)
  const hours = [12, 3, 6, 9, 12, 2, 5, 12, 10]
  for (let i = 0; i < 9; i++) {
    const x = 136 + (i % 3) * 120
    const y = 136 + Math.floor(i / 3) * 120
    g.fillStyle = '#f3f5f9'
    g.beginPath()
    g.arc(x, y, 47, 0, Math.PI * 2)
    g.fill()
    g.strokeStyle = '#8b9ab8'
    g.lineWidth = 5
    g.stroke()
    g.fillStyle = '#2a3a5c'
    for (let h = 0; h < 12; h++) {
      const a = (h / 12) * Math.PI * 2
      g.beginPath()
      g.arc(x + Math.sin(a) * 38, y - Math.cos(a) * 38, h % 3 ? 2.6 : 4.8, 0, Math.PI * 2)
      g.fill()
    }
    const a = (hours[i] / 12) * Math.PI * 2
    g.strokeStyle = '#d7263d'
    g.fillStyle = '#d7263d'
    g.lineWidth = 10
    g.lineCap = 'round'
    g.beginPath()
    g.moveTo(x - Math.sin(a) * 8, y + Math.cos(a) * 8)
    g.lineTo(x + Math.sin(a) * 29, y - Math.cos(a) * 29)
    g.stroke()
    g.beginPath()
    g.arc(x, y, 10, 0, Math.PI * 2)
    g.fill()
  }
  const t = finish(c)
  cache.set(key, t)
  return t
}

export function clearTextureCache() {
  cache.forEach((t) => t.dispose())
  cache.clear()
}
