import { Canvas, useFrame, type ThreeEvent } from '@react-three/fiber'
import { ContactShadows, OrbitControls } from '@react-three/drei'
import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { StudioLights } from '../cube/CubeCanvas'
import { PINS, type ClockState, type Pin } from './clock'

const R = 1.45
const T = 0.34
const GAP = 0.66
const DIAL = 0.27
const PIN_XY: Record<Pin, [number, number]> = { UL: [-0.33, 0.33], UR: [0.33, 0.33], DL: [-0.33, -0.33], DR: [0.33, -0.33] }
const WHEEL_XY: Record<Pin, [number, number]> = { UL: [-0.98, 0.98], UR: [0.98, 0.98], DL: [-0.98, -0.98], DR: [0.98, -0.98] }

let dialTex: THREE.Texture | null = null
function dialTexture() {
  if (dialTex) return dialTex
  const c = document.createElement('canvas')
  c.width = c.height = 256
  const g = c.getContext('2d')!
  g.fillStyle = '#f6f7fa'
  g.beginPath()
  g.arc(128, 128, 124, 0, Math.PI * 2)
  g.fill()
  for (let h = 0; h < 12; h++) {
    const a = (h / 12) * Math.PI * 2
    g.fillStyle = h === 0 ? '#d7263d' : '#2a3a5c'
    g.beginPath()
    g.arc(128 + Math.sin(a) * 100, 128 - Math.cos(a) * 100, h === 0 ? 13 : h % 3 ? 5 : 8, 0, Math.PI * 2)
    g.fill()
  }
  dialTex = new THREE.CanvasTexture(c)
  dialTex.colorSpace = THREE.SRGBColorSpace
  dialTex.anisotropy = 8
  return dialTex
}

const handShape = (() => {
  const s = new THREE.Shape()
  s.moveTo(-0.028, -0.05)
  s.lineTo(0.028, -0.05)
  s.lineTo(0.028, 0.12)
  s.lineTo(0.06, 0.12)
  s.lineTo(0, 0.21)
  s.lineTo(-0.06, 0.12)
  s.lineTo(-0.028, 0.12)
  s.closePath()
  return s
})()

/** nine dials of one face, laid out as seen when looking straight at that face */
function Face({ values, back }: { values: number[]; back?: boolean }) {
  const hands = useRef<(THREE.Group | null)[]>([])
  const shown = useRef<number[]>([...values])
  const handGeo = useMemo(() => new THREE.ExtrudeGeometry(handShape, { depth: 0.012, bevelEnabled: false }), [])
  useFrame((_, dt) => {
    values.forEach((v, i) => {
      shown.current[i] = THREE.MathUtils.damp(shown.current[i], v, 10, dt)
      const h = hands.current[i]
      if (h) h.rotation.z = (-shown.current[i] * Math.PI) / 6
    })
  })
  return (
    <group position-z={back ? -T / 2 : T / 2} rotation-y={back ? Math.PI : 0}>
      <mesh position-z={0.002} receiveShadow>
        <circleGeometry args={[R - 0.07, 64]} />
        <meshStandardMaterial color={back ? '#cfdcf2' : '#13244a'} roughness={0.45} />
      </mesh>
      {values.map((_, i) => {
        const x = ((i % 3) - 1) * GAP
        const y = (1 - Math.floor(i / 3)) * GAP
        return (
          <group key={i} position={[x, y, 0.006]}>
            <mesh>
              <circleGeometry args={[DIAL, 48]} />
              <meshStandardMaterial map={dialTexture()} roughness={0.35} />
            </mesh>
            <group ref={(el) => void (hands.current[i] = el)} position-z={0.004}>
              <mesh geometry={handGeo} castShadow>
                <meshStandardMaterial color="#d7263d" roughness={0.35} />
              </mesh>
              <mesh position-z={0.014}>
                <circleGeometry args={[0.035, 24]} />
                <meshStandardMaterial color="#1a1d22" />
              </mesh>
            </group>
          </group>
        )
      })}
    </group>
  )
}

function Wheel({ pin, onTurn }: { pin: Pin; onTurn: (pin: Pin, dir: 1 | -1) => void }) {
  const ref = useRef<THREE.Group>(null)
  const target = useRef(0)
  const [hover, setHover] = useState(false)
  useEffect(() => {
    document.body.style.cursor = hover ? 'pointer' : ''
    return () => void (document.body.style.cursor = '')
  }, [hover])
  useFrame((_, dt) => {
    if (ref.current) ref.current.rotation.z = THREE.MathUtils.damp(ref.current.rotation.z, target.current, 10, dt)
  })
  const turn = (e: ThreeEvent<MouseEvent>, dir: 1 | -1) => {
    e.stopPropagation()
    // the wheel spins the opposite way to the dials it drives, seen from the same side
    target.current -= (dir * Math.PI) / 6
    onTurn(pin, dir)
  }
  const [x, y] = WHEEL_XY[pin]
  return (
    <group position={[x, y, 0]}>
      <group
        ref={ref}
        onPointerOver={(e) => {
          e.stopPropagation()
          setHover(true)
        }}
        onPointerOut={() => setHover(false)}
        onClick={(e) => turn(e, e.shiftKey ? -1 : 1)}
        onContextMenu={(e) => {
          e.nativeEvent.preventDefault()
          turn(e, -1)
        }}
      >
        <mesh rotation-x={Math.PI / 2} castShadow>
          <cylinderGeometry args={[0.36, 0.36, T * 0.62, 40]} />
          <meshStandardMaterial color={hover ? '#ffffff' : '#e3e8ef'} roughness={0.4} />
        </mesh>
        {Array.from({ length: 18 }, (_, k) => {
          const a = (k / 18) * Math.PI * 2
          return (
            <mesh key={k} position={[Math.cos(a) * 0.365, Math.sin(a) * 0.365, 0]} rotation-z={a}>
              <boxGeometry args={[0.03, 0.04, T * 0.6]} />
              <meshStandardMaterial color="#b9c2cf" roughness={0.5} />
            </mesh>
          )
        })}
      </group>
    </group>
  )
}

function PinRod({ pin, up, onToggle }: { pin: Pin; up: boolean; onToggle: (p: Pin) => void }) {
  const ref = useRef<THREE.Mesh>(null)
  const [hover, setHover] = useState(false)
  useEffect(() => {
    document.body.style.cursor = hover ? 'pointer' : ''
    return () => void (document.body.style.cursor = '')
  }, [hover])
  useFrame((_, dt) => {
    if (ref.current) ref.current.position.z = THREE.MathUtils.damp(ref.current.position.z, up ? T / 2 + 0.04 : -T / 2 - 0.04, 14, dt)
  })
  const [x, y] = PIN_XY[pin]
  return (
    <mesh
      ref={ref}
      position={[x, y, up ? T / 2 + 0.04 : -T / 2 - 0.04]}
      rotation-x={Math.PI / 2}
      onPointerOver={(e) => {
        e.stopPropagation()
        setHover(true)
      }}
      onPointerOut={() => setHover(false)}
      onClick={(e) => {
        e.stopPropagation()
        onToggle(pin)
      }}
      castShadow
    >
      <cylinderGeometry args={[0.075, 0.075, 0.16, 20]} />
      <meshStandardMaterial color={hover ? '#ffe36b' : '#ffd21f'} roughness={0.3} emissive="#3a2c00" emissiveIntensity={0.3} />
    </mesh>
  )
}

function ClockPuzzle3D({ state, frontUp, flipped, onPin, onWheel }: ClockStageProps) {
  const group = useRef<THREE.Group>(null)
  const pop = useRef(0)
  useFrame((_, dt) => {
    const g = group.current
    if (!g) return
    g.rotation.y = THREE.MathUtils.damp(g.rotation.y, flipped ? Math.PI : 0, 7, dt)
    if (pop.current < 1) {
      pop.current = Math.min(1, pop.current + dt / 0.6)
      const x = pop.current
      const c = 1.70158
      g.scale.setScalar(Math.max(0.001, 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2)))
    }
  })
  return (
    <group ref={group}>
      <mesh rotation-x={Math.PI / 2} castShadow receiveShadow>
        <cylinderGeometry args={[R, R, T, 96]} />
        <meshStandardMaterial color="#1f4fb0" roughness={0.38} />
      </mesh>
      <Face values={state.front} />
      <Face values={state.back} back />
      {PINS.map((p) => (
        <PinRod key={p} pin={p} up={frontUp[p]} onToggle={onPin} />
      ))}
      {PINS.map((p) => (
        <Wheel key={p} pin={p} onTurn={onWheel} />
      ))}
    </group>
  )
}

export interface ClockStageProps {
  state: ClockState
  /** which pins stick out of the front */
  frontUp: Record<Pin, boolean>
  /** true while the back faces the viewer */
  flipped: boolean
  /** pin in front-face coordinates */
  onPin: (p: Pin) => void
  /** wheel in front-face coordinates; dir is clockwise as seen by the viewer */
  onWheel: (p: Pin, dir: 1 | -1) => void
  dark?: boolean
}

export function ClockStage(props: ClockStageProps) {
  const dist = 7.8
  return (
    <div style={{ touchAction: 'none' }}>
      <Canvas shadows dpr={[1, 2]} camera={{ position: [dist * 0.18, dist * 0.22, dist * 0.96], fov: 35 }} gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.05 }}>
        <Suspense fallback={null}>
          <StudioLights dark={props.dark} />
          <ClockPuzzle3D {...props} />
          <ContactShadows position={[0, -R - 0.25, 0]} opacity={props.dark ? 0.7 : 0.45} scale={8} blur={2.6} far={3} />
        </Suspense>
        <OrbitControls makeDefault enablePan={false} enableDamping minDistance={5} maxDistance={14} minPolarAngle={0.5} maxPolarAngle={2.2} />
      </Canvas>
    </div>
  )
}
