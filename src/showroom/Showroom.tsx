import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Environment, Html, Lightformer, PerformanceMonitor, useGLTF } from '@react-three/drei'
import { Bloom, EffectComposer, N8AO, SMAA, Vignette } from '@react-three/postprocessing'
import { Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import * as THREE from 'three'
import { CubeObject } from '../cube/CubeCanvas'
import { plasterTexture, posterTexture, signTexture, woodTexture } from './textures'
import { useLang, L, type Lang, type Tx } from '../i18n'
import { ClockPuzzle, Megaminx, MirrorCube, Pyraminx, Skewb, SpeedTimer, SquareOne } from './puzzles'

const ROOM = 7
const HEIGHT = 6.4
const TROPHY_URL = `${import.meta.env.BASE_URL}models/trophy.glb`
const PLANT_URL = `${import.meta.env.BASE_URL}models/plant.glb`
useGLTF.preload(TROPHY_URL)
useGLTF.preload(PLANT_URL)

export type PickTarget = { kind: 'cube'; n: number; label: string } | { kind: 'link'; to: string; label: string }

export interface ShowroomProps {
  wall: number
  dark: boolean
  /** pause rendering while the hero is scrolled out of view */
  active?: boolean
  onPick: (target: PickTarget) => void
}

interface Palette {
  dark: boolean
  wall: string
  floor: string
  ceiling: string
  trim: string
  hemi: number
  spot: number
  fill: number
  spotColor: string
  env: number
}
const LIGHT: Palette = { dark: false, wall: '#e9ece9', floor: '#c3cbc5', ceiling: '#f2f4f2', trim: '#dfe5e1', hemi: 1.0, spot: 55, fill: 14, spotColor: '#fff6ea', env: 0.6 }
const DARK: Palette = { dark: true, wall: '#1b2620', floor: '#121b16', ceiling: '#111a15', trim: '#223129', hemi: 0.18, spot: 110, fill: 22, spotColor: '#ffe7c4', env: 0.22 }

/** where the key light sits / aims for each wall, in wall-local coordinates */
const SPOTS: { from: [number, number, number]; to: [number, number, number]; angle: number }[] = [
  { from: [0, HEIGHT - 0.3, 3.6], to: [0, 2.3, 0.3], angle: 0.5 },
  { from: [0, HEIGHT - 0.3, 3.6], to: [0, 2.5, 0.2], angle: 0.62 },
  { from: [0, HEIGHT - 0.2, 3.4], to: [0, 1.6, 1.6], angle: 0.44 },
  { from: [0, HEIGHT - 0.3, 3.6], to: [0, 1.5, 0.8], angle: 0.56 },
]

function toWorld(i: number, p: [number, number, number]) {
  const v = new THREE.Vector3(p[0], p[1], p[2] - ROOM)
  return v.applyAxisAngle(new THREE.Vector3(0, 1, 0), (-i * Math.PI) / 2)
}

// ------------------------------------------------------------------ camera + key light
function Rig({ wall, p }: { wall: number; p: Palette }) {
  const { camera, pointer, size } = useThree()
  // portrait screens: step back and widen the lens so the whole wall fits
  const k = Math.min(2.6, Math.max(1, 1.4 / (size.width / Math.max(1, size.height))))
  useEffect(() => {
    const cam = camera as THREE.PerspectiveCamera
    cam.fov = 50 + (k - 1) * 16
    cam.updateProjectionMatrix()
  }, [camera, k])
  const yaw = useRef(0)
  const target = useRef(0)
  const light = useRef<THREE.SpotLight>(null)
  const aim = useMemo(() => new THREE.Object3D(), [])
  useEffect(() => {
    const desired = (-wall * Math.PI) / 2
    let d = desired - (target.current % (Math.PI * 2))
    d = ((((d + Math.PI) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2)) - Math.PI
    target.current += d
  }, [wall])
  useEffect(() => {
    if (light.current) light.current.target = aim
  }, [aim])
  useFrame((_, dt) => {
    yaw.current = THREE.MathUtils.damp(yaw.current, target.current, 3.2, dt)
    const y = yaw.current + pointer.x * -0.04
    const dir = new THREE.Vector3(-Math.sin(y), 0, -Math.cos(y))
    const pos = dir.clone().multiplyScalar(-1.3 - (k - 1) * 0.9)
    pos.y = 2.15
    camera.position.lerp(pos, 1 - Math.exp(-dt * 6))
    const look = camera.position.clone().add(dir.multiplyScalar(10))
    look.y = 1.95 + pointer.y * 0.3
    camera.lookAt(look)
    // the single shadow-casting light glides to the wall being viewed
    const s = SPOTS[wall]
    const lk = 1 - Math.exp(-dt * 3.5)
    if (light.current) {
      light.current.position.lerp(toWorld(wall, s.from), lk)
      light.current.angle = THREE.MathUtils.lerp(light.current.angle, s.angle, lk)
    }
    aim.position.lerp(toWorld(wall, s.to), lk)
    aim.updateMatrixWorld()
  })
  return (
    <>
      <primitive object={aim} />
      <spotLight
        ref={light}
        position={toWorld(0, SPOTS[0].from).toArray()}
        angle={SPOTS[0].angle}
        penumbra={0.85}
        intensity={p.spot}
        color={p.spotColor}
        distance={15}
        decay={1.6}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-bias={-0.0003}
        shadow-normalBias={0.03}
      />
    </>
  )
}

// ------------------------------------------------------------------ helpers
function Hoverable({ children, onClick, label, lift = 0.05 }: { children: ReactNode; onClick?: () => void; label?: string; lift?: number }) {
  const ref = useRef<THREE.Group>(null)
  const [hover, setHover] = useState(false)
  useFrame((_, dt) => {
    if (!ref.current) return
    const s = THREE.MathUtils.damp(ref.current.scale.x, hover ? 1.06 : 1, 8, dt)
    ref.current.scale.setScalar(s)
    ref.current.position.y = THREE.MathUtils.damp(ref.current.position.y, hover ? lift : 0, 8, dt)
  })
  useEffect(() => {
    if (!onClick) return
    document.body.style.cursor = hover ? 'pointer' : ''
    return () => {
      document.body.style.cursor = ''
    }
  }, [hover])
  return (
    <group
      ref={ref}
      onPointerOver={(e) => {
        e.stopPropagation()
        setHover(true)
      }}
      onPointerOut={() => setHover(false)}
      onClick={(e) => {
        e.stopPropagation()
        onClick?.()
      }}
    >
      {children}
      {label && hover && (
        <Html center position={[0, 0.6, 0]} style={{ pointerEvents: 'none' }} zIndexRange={[20, 0]}>
          <div className="sr-tip">{label}</div>
        </Html>
      )}
    </group>
  )
}

/** Springs its children in (scale + rise) whenever `k` changes. */
function Pop({ k, delay = 0, children }: { k: number; delay?: number; children: ReactNode }) {
  const ref = useRef<THREE.Group>(null)
  const t = useRef(-delay)
  useEffect(() => {
    t.current = -delay
  }, [k, delay])
  useFrame((_, dt) => {
    if (!ref.current || t.current > 1) return
    t.current += dt / 0.7
    const x = Math.min(1, Math.max(0, t.current))
    const c1 = 1.70158
    const e = 1 + (c1 + 1) * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2)
    ref.current.scale.setScalar(Math.max(0.0001, e))
    ref.current.position.y = (1 - Math.min(1, x * 1.4)) * -0.25
  })
  return (
    <group ref={ref} scale={0.0001}>
      {children}
    </group>
  )
}

function Model({ url, scale = 1, rotation = 0 }: { url: string; scale?: number; rotation?: number }) {
  const { scene } = useGLTF(url)
  const obj = useMemo(() => {
    const c = scene.clone(true)
    c.traverse((o) => {
      const m = o as THREE.Mesh
      if (m.isMesh) {
        m.castShadow = true
        m.receiveShadow = true
      }
    })
    return c
  }, [scene])
  return <primitive object={obj} scale={scale} rotation-y={rotation} />
}

function Wood({ tone = 'birch', repeat = 1 }: { tone?: 'birch' | 'walnut'; repeat?: number }) {
  const map = useMemo(() => {
    const t = woodTexture(tone).clone()
    t.repeat.set(repeat, 1)
    t.needsUpdate = true
    return t
  }, [tone, repeat])
  return <meshStandardMaterial map={map} roughness={0.62} metalness={0} />
}

// ------------------------------------------------------------------ room shell
function Room({ p }: { p: Palette }) {
  const plaster = plasterTexture()
  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} receiveShadow>
        <planeGeometry args={[ROOM * 2, ROOM * 2]} />
        <meshStandardMaterial color={p.floor} roughness={0.42} metalness={0.05} envMapIntensity={0.9} />
      </mesh>
      <mesh rotation-x={Math.PI / 2} position-y={HEIGHT}>
        <planeGeometry args={[ROOM * 2, ROOM * 2]} />
        <meshBasicMaterial color={p.ceiling} />
      </mesh>
      {[0, 1, 2, 3].map((i) => (
        <group key={i} rotation-y={(-i * Math.PI) / 2}>
          <mesh position={[0, HEIGHT / 2, -ROOM]} receiveShadow>
            <planeGeometry args={[ROOM * 2, HEIGHT]} />
            <meshStandardMaterial color={p.wall} roughness={0.95} map={plaster} />
          </mesh>
          <mesh position={[0, 0.09, -ROOM + 0.025]}>
            <boxGeometry args={[ROOM * 2, 0.18, 0.05]} />
            <meshStandardMaterial color={p.trim} roughness={0.7} />
          </mesh>
          <mesh position={[0, HEIGHT - 0.16, -ROOM + 0.18]}>
            <boxGeometry args={[ROOM * 2 - 0.4, 0.03, 0.3]} />
            <meshBasicMaterial color={p.dark ? '#fff1d6' : '#ffffff'} toneMapped={false} />
          </mesh>
          <mesh position={[ROOM - 0.35, HEIGHT / 2, -ROOM + 0.35]}>
            <cylinderGeometry args={[0.5, 0.5, HEIGHT, 20, 1, true, Math.PI, Math.PI / 2]} />
            <meshStandardMaterial color={p.wall} roughness={0.95} side={THREE.BackSide} />
          </mesh>
          {/* soft wash light on every wall, no shadows (cheap) */}
          <pointLight position={[0, HEIGHT - 1.2, -ROOM + 2.2]} intensity={p.fill} distance={7} decay={1.5} color={p.spotColor} />
        </group>
      ))}
    </group>
  )
}

function WallSlot({ index, children }: { index: number; children: ReactNode }) {
  return (
    <group rotation-y={(-index * Math.PI) / 2}>
      <group position={[0, 0, -ROOM]}>{children}</group>
    </group>
  )
}

interface WallProps {
  p: Palette
  k: number
  lang: Lang
  t: (x: Tx) => string
  onPick: ShowroomProps['onPick']
}

// ------------------------------------------------------------------ wall 0: collection shelf
const CELL_W = 1.25
const CELL_H = 1.05
const DEPTH = 0.55
const T = 0.05
const SHELF_Y = 0.75

function Shelf({ children }: { children: (cell: (c: number, r: number) => [number, number, number]) => ReactNode }) {
  const W = 3 * CELL_W + 4 * T
  const H = 3 * CELL_H + 4 * T
  const boards: [number, number, number, number, number, number][] = []
  for (let i = 0; i < 4; i++) boards.push([0, SHELF_Y + i * (CELL_H + T) + T / 2, 0, W, T, DEPTH])
  for (let i = 0; i < 4; i++) boards.push([-W / 2 + T / 2 + i * (CELL_W + T), SHELF_Y + H / 2, 0, T, H, DEPTH])
  const cell = (c: number, r: number): [number, number, number] => [-W / 2 + T + CELL_W / 2 + c * (CELL_W + T), SHELF_Y + T + r * (CELL_H + T), 0.02]
  return (
    <group position={[0, 0, DEPTH / 2 + 0.03]}>
      {boards.map((b, i) => (
        <mesh key={i} position={[b[0], b[1], b[2]]} castShadow receiveShadow>
          <boxGeometry args={[b[3], b[4], b[5]]} />
          <Wood repeat={b[3] > 1 ? 2 : 1} />
        </mesh>
      ))}
      <mesh position={[0, SHELF_Y + H / 2, -DEPTH / 2 + 0.01]} receiveShadow>
        <boxGeometry args={[W, H, 0.02]} />
        <Wood repeat={2} />
      </mesh>
      {children(cell)}
    </group>
  )
}

function Books({ colors, rotation = 0 }: { colors: string[]; rotation?: number }) {
  let y = 0
  return (
    <group rotation-y={rotation}>
      {colors.map((c, i) => {
        const h = 0.07 + (i % 2) * 0.02
        const el = (
          <mesh key={i} position={[(i % 2) * 0.03, y + h / 2, 0]} rotation-y={i * 0.08} castShadow receiveShadow>
            <boxGeometry args={[0.62 - i * 0.04, h, 0.42]} />
            <meshStandardMaterial color={c} roughness={0.75} />
          </mesh>
        )
        y += h
        return el
      })}
    </group>
  )
}

const AVATAR_URL = 'https://avatars.githubusercontent.com/phucnguyen020611?s=320'

/** Standing picture frame (black frame, white mat) with a small easel leg behind it. */
function PhotoFrame({ url, w = 0.5, h = 0.6 }: { url: string; w?: number; h?: number }) {
  const [map, setMap] = useState<THREE.Texture | null>(null)
  useEffect(() => {
    let alive = true
    const loader = new THREE.TextureLoader()
    loader.setCrossOrigin('anonymous')
    loader.load(
      url,
      (tex) => {
        tex.colorSpace = THREE.SRGBColorSpace
        tex.anisotropy = 8
        if (alive) setMap(tex)
        else tex.dispose()
      },
      undefined,
      () => {},
    )
    return () => {
      alive = false
    }
  }, [url])
  const lean = -0.14
  const photo = Math.min(w, h) - 0.13
  return (
    <group rotation-x={lean} position-y={(h / 2) * Math.cos(lean)}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[w, h, 0.035]} />
        <meshStandardMaterial color="#17191a" roughness={0.35} />
      </mesh>
      <mesh position-z={0.0181}>
        <planeGeometry args={[w - 0.05, h - 0.05]} />
        <meshStandardMaterial color="#f4f2ec" roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.02, 0.0186]}>
        <planeGeometry args={[photo, photo]} />
        {map ? <meshStandardMaterial key="photo" map={map} emissive="#ffffff" emissiveMap={map} emissiveIntensity={0.55} roughness={0.6} /> : <meshStandardMaterial key="blank" color="#d8dcd8" roughness={0.9} />}
      </mesh>
      {/* glass */}
      <mesh position-z={0.0195}>
        <planeGeometry args={[w - 0.05, h - 0.05]} />
        <meshStandardMaterial color="#ffffff" transparent opacity={0.06} roughness={0.05} metalness={0.2} />
      </mesh>
      <mesh position={[0, -0.04, -0.1]} rotation-x={0.55}>
        <boxGeometry args={[0.07, h * 0.82, 0.015]} />
        <meshStandardMaterial color="#17191a" roughness={0.5} />
      </mesh>
    </group>
  )
}

/** Narrow floating shelves either side of the main unit, one puzzle per board. */
const VARIANTS: { name: Tx; note: Tx; el: () => ReactNode }[][] = [
  [
    { name: L('Megaminx', 'Megaminx'), note: L('12 mặt ngũ giác', '12 pentagon faces'), el: () => <Megaminx /> },
    { name: L('Skewb', 'Skewb'), note: L('Xoay quanh các góc', 'Turns around its corners'), el: () => <Skewb /> },
    { name: L('Pyraminx', 'Pyraminx'), note: L('Kim tự tháp 4 mặt', 'The four-sided pyramid'), el: () => <Pyraminx /> },
  ],
  [
    { name: L('Clock', 'Clock'), note: L('18 mặt đồng hồ, không xoay khối', '18 dials, no layers to turn'), el: () => <ClockPuzzle /> },
    { name: L('Mirror cube', 'Mirror cube'), note: L('3×3 giải theo hình dạng', 'A 3×3 solved by shape'), el: () => <MirrorCube /> },
    { name: L('Square-1', 'Square-1'), note: L('Biến hình khi xoay', 'Changes shape as you turn'), el: () => <SquareOne /> },
  ],
]
const TOWER_X = 3.35
const TOWER_Y = [3.35, 2.3, 1.25]

function VariantTowers({ p, k, t }: { p: Palette; k: number; t: (x: Tx) => string }) {
  return (
    <>
      {VARIANTS.map((col, side) => (
        <group key={side} position-x={(side ? 1 : -1) * TOWER_X}>
          <pointLight position={[0, 4.3, 1.3]} intensity={p.dark ? 9 : 6} distance={4.5} decay={1.4} color={p.spotColor} />
          {col.map((item, i) => (
            <group key={i} position-y={TOWER_Y[i]}>
              <mesh position={[0, -0.025, 0.24]} castShadow receiveShadow>
                <boxGeometry args={[1.05, 0.05, 0.46]} />
                <Wood repeat={1} />
              </mesh>
              {/* warm strip light under the front edge */}
              <mesh position={[0, -0.052, 0.44]}>
                <boxGeometry args={[0.96, 0.006, 0.012]} />
                <meshBasicMaterial color={p.dark ? '#ffd9a0' : '#fff3df'} toneMapped={false} />
              </mesh>
              <group position={[0, 0, 0.26]} rotation-y={(side ? -1 : 1) * 0.35}>
                <Pop k={k} delay={0.4 + i * 0.12 + side * 0.06}>
                  <Hoverable label={`${t(item.name)} · ${t(item.note)}`}>{item.el()}</Hoverable>
                </Pop>
              </group>
            </group>
          ))}
        </group>
      ))}
    </>
  )
}

function CollectionWall({ p, k, t, onPick }: WallProps) {
  const pick = (n: number) => onPick({ kind: 'cube', n, label: `${n}×${n}` })
  const tip = (n: number) => t(L(`${n}×${n} · bấm để chọn`, `${n}×${n} · click to choose`))
  const cube = (n: number, size: number, pos: [number, number, number], i: number, setup?: string, rot = 0, loopAlg?: string) => (
    <group position={[pos[0], pos[1] + size / 2 + 0.004, pos[2] + 0.04]} rotation={[0, rot, 0]}>
      <Hoverable onClick={() => pick(n)} label={tip(n)}>
        <CubeObject n={n} size={size} setup={setup} loopAlg={loopAlg} lowPoly appear={k} appearDelay={250 + i * 140} />
      </Hoverable>
    </group>
  )
  return (
    <>
    <Shelf>
      {(cell) => (
        <>
          {cube(2, 0.5, cell(0, 2), 0, "R U' F2 R'", 0.35)}
          {cube(3, 0.6, cell(1, 2), 1, "R U R' U' F2 L' D", -0.25)}
          {cube(4, 0.7, cell(2, 2), 2, "Rw U2 Fw' R2 Uw", 0.3)}
          <group position={cell(0, 1)}>
            <Pop k={k} delay={0.55}>
              <group position={[-0.3, 0.077, -0.04]} scale={0.3}>
                <Model url={TROPHY_URL} />
              </group>
            </Pop>
            <group position={[0.22, 0, 0.04]} rotation-y={-0.28}>
              <Pop k={k} delay={0.65}>
                <Hoverable onClick={() => onPick({ kind: 'link', to: '/about', label: 'About' })} label={t(L('Phuc Nguyen Hoang · người làm trang này', 'Phuc Nguyen Hoang · made this site'))} lift={0.02}>
                  <PhotoFrame url={AVATAR_URL} />
                </Hoverable>
              </Pop>
            </group>
          </group>
          {cube(3, 0.6, cell(1, 1), 3, '', -0.55, "R U R' U R U2 R'")}
          <group position={cell(2, 1)}>
            <Pop k={k} delay={0.7}>
              <Model url={PLANT_URL} scale={0.62} rotation={0.6} />
            </Pop>
          </group>
          {cube(5, 0.8, cell(0, 0), 4, 'R2 L2 U2 D2 F2 B2', 0.25)}
          <group position={cell(1, 0)}>
            <Pop k={k} delay={0.8}>
              <Books colors={['#13693b', '#e9e2d0', '#1f3b2c', '#c7a250']} rotation={0.12} />
            </Pop>
            <group position={[0.05, 0.54, 0.02]} rotation-y={0.7}>
              <Hoverable onClick={() => pick(3)} label={tip(3)}>
                <CubeObject n={3} size={0.4} setup="M2 E2 S2" lowPoly appear={k} appearDelay={950} />
              </Hoverable>
            </group>
          </group>
          <group position={cell(2, 0)}>
            <Pop k={k} delay={0.9}>
              <Hoverable onClick={() => onPick({ kind: 'link', to: '/timer', label: 'Timer' })} label={t(L('Đồng hồ bấm giờ', 'Speed timer'))}>
                <group position={[0, 0, 0.08]}>
                  <group scale={1.1}><SpeedTimer /></group>
                </group>
              </Hoverable>
            </Pop>
          </group>
        </>
      )}
    </Shelf>
    <VariantTowers p={p} k={k} t={t} />
    </>
  )
}

// ------------------------------------------------------------------ wall 1: posters
function Poster({ x, spec, to, k, delay, onPick, tip }: { x: number; spec: Parameters<typeof posterTexture>[0]; to: string; k: number; delay: number; onPick: ShowroomProps['onPick']; tip: string }) {
  const map = posterTexture(spec)
  return (
    <group position={[x, 3.05, 0.06]}>
      <Pop k={k} delay={delay}>
        <Hoverable onClick={() => onPick({ kind: 'link', to, label: spec.title })} label={tip} lift={0.02}>
          <mesh castShadow>
            <boxGeometry args={[1.62, 2.12, 0.06]} />
            <meshStandardMaterial color="#151816" roughness={0.45} />
          </mesh>
          <mesh position-z={0.032}>
            <planeGeometry args={[1.5, 2.0]} />
            <meshStandardMaterial color="#f7f7f3" roughness={0.9} />
          </mesh>
          <mesh position-z={0.034}>
            <planeGeometry args={[1.32, 1.76]} />
            <meshStandardMaterial map={map} roughness={0.6} />
          </mesh>
        </Hoverable>
      </Pop>
    </group>
  )
}

function LearnWall({ k, lang, t, onPick }: WallProps) {
  const posters = [
    { x: -1.95, to: '/learn/beginner', spec: { key: `p-beg-${lang}`, eyebrow: t(L('Bài 1', 'Lesson 1')), title: t(L('Người mới', 'Beginner')), subtitle: t(L('8 bước, chưa tới một tuần', '8 steps, under a week')), bg: '#e6f4ea', ink: '#0c2a17', art: 'beginner' as const } },
    { x: 0, to: '/learn/cfop', spec: { key: `p-cfop-${lang}`, eyebrow: t(L('Tăng tốc', 'Get faster')), title: 'CFOP', subtitle: 'Cross · F2L · OLL · PLL', bg: '#17663a', ink: '#ffffff', art: 'cfop' as const } },
    { x: 1.95, to: '/learn/iceberg', spec: { key: `p-ice-${lang}`, eyebrow: t(L('Khám phá', 'Explore')), title: t(L('Tảng băng', 'Iceberg')), subtitle: t(L('30 kỹ thuật, từ dễ đến khó', '30 ideas, easy to insane')), bg: '#0d4f8f', ink: '#ffffff', art: 'iceberg' as const } },
  ]
  return (
    <>
      {posters.map((s, i) => (
        <Poster key={s.to} x={s.x} spec={s.spec} to={s.to} k={k} delay={0.15 + i * 0.12} onPick={onPick} tip={t(L(`Mở: ${s.spec.title}`, `Open: ${s.spec.title}`))} />
      ))}
      <mesh position={[0, 1.35, 0.25]} castShadow receiveShadow>
        <boxGeometry args={[5.4, 0.07, 0.5]} />
        <Wood tone="walnut" repeat={3} />
      </mesh>
      <group position={[-1.6, 1.39, 0.28]}>
        <Pop k={k} delay={0.6}>
          <Books colors={['#f2c14e', '#13693b', '#ece6d6']} rotation={-0.2} />
        </Pop>
      </group>
      <group position={[0, 1.39 + 0.29, 0.27]} rotation-y={-0.5}>
        <Hoverable onClick={() => onPick({ kind: 'link', to: '/learn/oll', label: 'OLL' })} label={t(L('Xem Sune trong thư viện OLL', 'See Sune in the OLL library'))}>
          <CubeObject n={3} size={0.56} scheme="yellowTop" mask="oll" loopAlg="R U R' U R U2 R'" lowPoly appear={k} appearDelay={500} />
        </Hoverable>
      </group>
      <group position={[1.75, 1.39, 0.27]}>
        <Pop k={k} delay={0.75}>
          <Model url={PLANT_URL} scale={0.5} rotation={2} />
        </Pop>
      </group>
    </>
  )
}

// ------------------------------------------------------------------ wall 2: pedestal
function PlayWall({ p, k, lang, t, onPick }: WallProps) {
  const text = t(L('CHƠI TỰ DO', 'FREE PLAY'))
  const sign = p.dark ? signTexture(`sign-play-d-${lang}`, text, { color: '#9dffc4', glow: 30 }) : signTexture(`sign-play-l-${lang}`, text, { color: '#17663a', glow: 0 })
  const ring = useRef<THREE.Mesh>(null)
  useFrame(({ clock }) => {
    if (ring.current) ring.current.scale.setScalar(1 + Math.sin(clock.elapsedTime * 1.4) * 0.012)
  })
  return (
    <>
      <mesh position={[0, 4.55, 0.03]}>
        <planeGeometry args={[3.6, 0.9]} />
        <meshBasicMaterial map={sign} transparent toneMapped={!p.dark} />
      </mesh>
      <mesh ref={ring} position={[0, 2.55, 0.04]}>
        <torusGeometry args={[1.45, 0.022, 12, 96]} />
        <meshBasicMaterial color={p.dark ? '#2ad37a' : '#1a8046'} toneMapped={false} />
      </mesh>
      <group position={[0, 0, 1.6]}>
        <mesh position-y={0.55} castShadow receiveShadow>
          <cylinderGeometry args={[0.55, 0.6, 1.1, 48]} />
          <meshStandardMaterial color={p.dark ? '#1f2a24' : '#f4f4f1'} roughness={0.3} />
        </mesh>
        <mesh position-y={1.11}>
          <cylinderGeometry args={[0.62, 0.62, 0.03, 48]} />
          <meshStandardMaterial color="#c9a24a" metalness={1} roughness={0.25} />
        </mesh>
        <group position-y={2.05}>
          <Hoverable onClick={() => onPick({ kind: 'link', to: '/play', label: 'Play' })} label={t(L('Bấm để chơi', 'Click to play'))}>
            <CubeObject n={3} size={1.05} idleSpin loopAlg="R U F' L2 D B' R2 U'" appear={k} appearDelay={200} />
          </Hoverable>
        </group>
      </group>
    </>
  )
}

// ------------------------------------------------------------------ wall 3: desk
function ToolsWall({ p, k, lang, t, onPick }: WallProps) {
  const text = t(L('BẤM GIỜ · LUYỆN TẬP', 'TIMER · PRACTICE'))
  const sign = p.dark ? signTexture(`sign-timer-d-${lang}`, text, { color: '#ffe6a8', glow: 24 }) : signTexture(`sign-timer-l-${lang}`, text, { color: '#8a5a00', glow: 0 })
  const poster = posterTexture({ key: `p-train-${lang}`, eyebrow: 'Trainer', title: t(L('Luyện tập', 'Practice')), subtitle: 'OLL · PLL · F2L', bg: '#f3c14b', ink: '#2a1a00', art: 'trainer' })
  return (
    <>
      <mesh position={[0, 4.45, 0.03]}>
        <planeGeometry args={[4.4, 1.1]} />
        <meshBasicMaterial map={sign} transparent toneMapped={!p.dark} />
      </mesh>
      <group position={[0, 2.85, 0.05]}>
        <Pop k={k} delay={0.15}>
          <Hoverable onClick={() => onPick({ kind: 'link', to: '/trainer', label: 'Trainer' })} label={t(L('Luyện công thức', 'Practice algorithms'))} lift={0.02}>
            <mesh castShadow>
              <boxGeometry args={[1.22, 1.6, 0.05]} />
              <meshStandardMaterial color="#151816" roughness={0.4} />
            </mesh>
            <mesh position-z={0.027}>
              <planeGeometry args={[1.12, 1.5]} />
              <meshStandardMaterial color="#f7f7f3" roughness={0.9} />
            </mesh>
            <mesh position-z={0.029}>
              <planeGeometry args={[0.98, 1.31]} />
              <meshStandardMaterial map={poster} roughness={0.6} />
            </mesh>
          </Hoverable>
        </Pop>
      </group>
      <group position={[0, 0, 0.75]}>
        <mesh position-y={1.0} castShadow receiveShadow>
          <boxGeometry args={[3.4, 0.07, 1.1]} />
          <Wood tone="walnut" repeat={2} />
        </mesh>
        {[-1.55, 1.55].map((x) =>
          [-0.45, 0.45].map((z) => (
            <mesh key={`${x}${z}`} position={[x, 0.48, z]} castShadow>
              <cylinderGeometry args={[0.03, 0.03, 0.96, 10]} />
              <meshStandardMaterial color="#1b1f1d" metalness={0.8} roughness={0.35} />
            </mesh>
          )),
        )}
        <group position={[-0.2, 1.035, 0.05]}>
          <Pop k={k} delay={0.3}>
            <mesh position-y={0.006} receiveShadow>
              <boxGeometry args={[1.3, 0.012, 0.62]} />
              <meshStandardMaterial color="#0f3d24" roughness={0.92} />
            </mesh>
            <Hoverable onClick={() => onPick({ kind: 'link', to: '/timer', label: 'Timer' })} label={t(L('Mở bộ bấm giờ', 'Open the timer'))}>
              <group position-y={0.012} scale={1.15}>
                <SpeedTimer time="0:09.87" />
              </group>
            </Hoverable>
          </Pop>
        </group>
        <group position={[0.85, 1.035 + 0.24, 0.1]} rotation-y={0.5}>
          <Hoverable onClick={() => onPick({ kind: 'cube', n: 3, label: '3×3' })} label={t(L('3×3 · bấm để chọn', '3×3 · click to choose'))}>
            <CubeObject n={3} size={0.46} setup="F R U' R' U' R U R' F' R U R' U' R' F R F'" lowPoly appear={k} appearDelay={450} />
          </Hoverable>
        </group>
        <group position={[-1.3, 1.035, 0.0]}>
          <Pop k={k} delay={0.5}>
            <Books colors={['#ece6d6', '#13693b']} rotation={0.3} />
          </Pop>
        </group>
        <group position={[1.45, 1.035, -0.25]}>
          <Pop k={k} delay={0.6}>
            <Model url={PLANT_URL} scale={0.42} />
          </Pop>
        </group>
      </group>
    </>
  )
}

// ------------------------------------------------------------------ scene
function Scene({ wall, dark, onPick, lowFx }: ShowroomProps & { lowFx: boolean }) {
  const { lang, t } = useLang()
  const p = dark ? DARK : LIGHT
  const { scene } = useThree()
  const [visits, setVisits] = useState([1, 0, 0, 0])
  useEffect(() => {
    setVisits((v) => v.map((x, i) => (i === wall ? x + 1 : x)))
  }, [wall])
  useEffect(() => {
    scene.background = new THREE.Color(p.wall)
    scene.environmentIntensity = p.env
  }, [scene, p])
  const walls = [CollectionWall, LearnWall, PlayWall, ToolsWall]
  return (
    <>
      <Rig wall={wall} p={p} />
      <hemisphereLight args={['#ffffff', p.floor, p.hemi]} />
      <Environment resolution={128} frames={1}>
        <Lightformer form="rect" intensity={2} position={[0, 6, 0]} rotation-x={Math.PI / 2} scale={[10, 10, 1]} />
        <Lightformer form="rect" intensity={1} position={[0, 3, -8]} scale={[12, 4, 1]} />
        <Lightformer form="rect" intensity={1} position={[0, 3, 8]} rotation-y={Math.PI} scale={[12, 4, 1]} />
        <Lightformer form="ring" intensity={1.4} position={[6, 3, 0]} rotation-y={-Math.PI / 2} scale={2} color="#c9ffe0" />
      </Environment>
      <Room p={p} />
      {walls.map((W, i) => (
        <WallSlot key={i} index={i}>
          <W p={p} k={visits[i]} lang={lang} t={t} onPick={onPick} />
        </WallSlot>
      ))}
      {/* anti-aliasing is never switched off: MSAA normally, SMAA on slow machines */}
      <EffectComposer multisampling={lowFx ? 0 : 8} enableNormalPass={false}>
        <N8AO aoRadius={0.5} intensity={dark ? 2 : 2.6} distanceFalloff={0.6} quality={lowFx ? 'performance' : 'medium'} halfRes={lowFx} />
        <Bloom intensity={dark ? 0.7 : 0} luminanceThreshold={0.9} luminanceSmoothing={0.2} mipmapBlur />
        <Vignette darkness={dark ? 0.5 : 0.28} offset={0.25} />
        {lowFx ? <SMAA /> : <></>}
      </EffectComposer>
    </>
  )
}

export default function Showroom(props: ShowroomProps) {
  const [fontsReady, setFontsReady] = useState(false)
  // render at the screen's real pixel density (capped at 2) and only step down gradually
  const maxDpr = Math.min(2, Math.max(1, window.devicePixelRatio || 1))
  const [dpr, setDpr] = useState(maxDpr)
  const [lowFx, setLowFx] = useState(false)
  useEffect(() => {
    let alive = true
    Promise.all([
      document.fonts.load('800 100px "Bricolage Grotesque"'),
      document.fonts.load('700 30px "Plus Jakarta Sans"'),
      document.fonts.load('700 100px "JetBrains Mono"'),
    ])
      .catch(() => {})
      .then(() => alive && setFontsReady(true))
    const id = setTimeout(() => alive && setFontsReady(true), 2500)
    return () => {
      alive = false
      clearTimeout(id)
    }
  }, [])
  return (
    <Canvas
      shadows
      dpr={dpr}
      frameloop={props.active === false ? 'never' : 'always'}
      camera={{ fov: 50, position: [0, 2.15, 1.3], near: 0.1, far: 40 }}
      gl={{ antialias: false, stencil: false, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: props.dark ? 0.95 : 1.0, powerPreference: 'high-performance' }}
    >
      <PerformanceMonitor
        bounds={(refresh) => (refresh > 90 ? [50, 90] : [40, 58])}
        flipflops={Infinity}
        factor={1}
        onChange={({ factor }) => {
          // a hidden or background tab reports low fps; never degrade because of that
          if (document.hidden) return
          const floor = Math.max(1, maxDpr * 0.8)
          setDpr(floor + (maxDpr - floor) * factor)
          setLowFx(factor < 0.15)
        }}
      />
      <Suspense fallback={null}>{fontsReady && <Scene {...props} lowFx={lowFx} />}</Suspense>
    </Canvas>
  )
}
