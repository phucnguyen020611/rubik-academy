import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { ContactShadows, Environment, Lightformer, OrbitControls, useGLTF } from '@react-three/drei'
import { Suspense, useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { CubeView, SPACING, type CubeGeometries } from './CubeView'
import type { SchemeName } from './schemes'
import type { MaskName } from '../data/beginner'
import type { Axis, Move } from './engine'
import { invertAlg, layerOf } from './engine'

export const MODEL_URL = `${import.meta.env.BASE_URL}models/cubie.glb`
export const MODEL_LO_URL = `${import.meta.env.BASE_URL}models/cubie_lo.glb`

export function useCubeGeometries(lowPoly = false): CubeGeometries {
  const gltf = useGLTF(lowPoly ? MODEL_LO_URL : MODEL_URL)
  return useMemo(() => {
    let body: THREE.BufferGeometry | undefined
    let sticker: THREE.BufferGeometry | undefined
    gltf.scene.traverse((o) => {
      const m = o as THREE.Mesh
      if (!m.isMesh) return
      if (/sticker/i.test(m.name)) sticker = m.geometry
      else if (/body/i.test(m.name)) body = m.geometry
    })
    if (!body || !sticker) throw new Error('cubie.glb is missing CubieBody/CubieSticker')
    return { body, sticker }
  }, [gltf])
}
useGLTF.preload(MODEL_URL)
useGLTF.preload(MODEL_LO_URL)

export interface CubeProps {
  n?: number
  scheme?: SchemeName
  mask?: MaskName
  setup?: string
  interactive?: boolean
  speed?: number
  onReady?: (view: CubeView) => void
  onMove?: (m: Move, solved: boolean) => void
  /** world-space size of the whole cube */
  size?: number
  idleSpin?: boolean
  /** play this algorithm, then its inverse, forever */
  loopAlg?: string
  /** use the lighter mesh (shelves, thumbnails) */
  lowPoly?: boolean
  /** change this value to replay the fly-in assembly */
  appear?: number | string
  appearDelay?: number
}

/** The cube itself – usable inside any R3F scene. */
export function CubeObject({ n = 3, scheme = 'standard', mask, setup, interactive = false, speed, onReady, onMove, size = 3, idleSpin, loopAlg, lowPoly, appear, appearDelay = 0 }: CubeProps) {
  const geoms = useCubeGeometries(lowPoly)
  const view = useMemo(() => new CubeView(n, geoms, { scheme, mask }), [geoms]) // eslint-disable-line react-hooks/exhaustive-deps
  const holder = useRef<THREE.Group>(null)

  useEffect(() => () => view.dispose(), [view])
  useEffect(() => {
    view.setSize(n)
    if (setup) view.setup(setup)
  }, [view, n, setup])
  useEffect(() => {
    view.setScheme(scheme)
  }, [view, scheme])
  useEffect(() => {
    view.setMask(mask)
  }, [view, mask])
  useEffect(() => {
    if (speed) view.speed = speed
  }, [view, speed])
  useEffect(() => {
    if (!onMove) return
    view.listeners.add(onMove)
    return () => void view.listeners.delete(onMove)
  }, [view, onMove])
  useEffect(() => {
    onReady?.(view)
  }, [view, onReady])
  useEffect(() => {
    if (appear === undefined) return
    view.assemble(appearDelay)
  }, [view, appear, appearDelay])
  useEffect(() => {
    if (!loopAlg) return
    let alive = true
    let forward = true
    let timer = 0
    const cycle = () => {
      if (!alive) return
      view.run(forward ? loopAlg : invertAlg(loopAlg, view.n), true, () => {
        forward = !forward
        timer = window.setTimeout(cycle, forward ? 1800 : 900)
      })
    }
    timer = window.setTimeout(cycle, 2200 + Math.random() * 1500)
    return () => {
      alive = false
      clearTimeout(timer)
      view.clearQueue()
    }
  }, [view, loopAlg])

  useFrame((_, dt) => {
    view.update(Math.min(dt, 0.05))
    if (idleSpin && holder.current) holder.current.rotation.y += dt * 0.25
  })

  const scale = size / (n * SPACING)
  return (
    <group ref={holder}>
      <primitive object={view.group} scale={scale} />
      {interactive && <DragController view={view} />}
    </group>
  )
}

/** Turns pointer drags on the cube into layer turns; drags elsewhere orbit the camera. */
function DragController({ view }: { view: CubeView }) {
  const { camera, gl, controls } = useThree()
  useEffect(() => {
    const el = gl.domElement
    const ray = new THREE.Raycaster()
    let st: null | {
      x: number
      y: number
      pick: NonNullable<ReturnType<CubeView['pick']>>
      decided: boolean
      dir?: THREE.Vector2
      pxPerUnit?: number
      radius?: number
      sign?: number
      pointerId: number
    } = null

    const ndc = (e: PointerEvent) => {
      const r = el.getBoundingClientRect()
      return new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1)
    }
    const toScreen = (local: THREE.Vector3) => {
      const r = el.getBoundingClientRect()
      const w = view.group.localToWorld(local.clone()).project(camera)
      return new THREE.Vector2(((w.x + 1) / 2) * r.width, ((1 - w.y) / 2) * r.height)
    }
    const setOrbit = (on: boolean) => {
      if (controls) (controls as unknown as { enabled: boolean }).enabled = on
    }

    const down = (e: PointerEvent) => {
      if (e.button !== 0) return
      ray.setFromCamera(ndc(e), camera)
      const pick = view.pick(ray)
      if (!pick) return
      // grabbing the cube never orbits the camera, even while a turn is still animating
      e.stopImmediatePropagation()
      if (view.busy) return
      setOrbit(false)
      el.setPointerCapture(e.pointerId)
      st = { x: e.clientX, y: e.clientY, pick, decided: false, pointerId: e.pointerId }
    }
    const move = (e: PointerEvent) => {
      if (!st || e.pointerId !== st.pointerId) return
      const drag = new THREE.Vector2(e.clientX - st.x, e.clientY - st.y)
      if (!st.decided) {
        if (drag.length() < 7) return
        const { axis: nAxis, sign, local } = st.pick
        const normal = new THREE.Vector3().setComponent(nAxis, sign)
        const p0 = toScreen(local)
        let best: { axis: Axis; score: number; s: THREE.Vector2 } | null = null
        for (const a of [0, 1, 2] as Axis[]) {
          if (a === nAxis) continue
          const axisV = new THREE.Vector3().setComponent(a, 1)
          const t = new THREE.Vector3().crossVectors(axisV, normal).multiplyScalar(0.35)
          const s = toScreen(local.clone().add(t)).sub(p0)
          if (s.length() < 1e-3) continue
          const score = drag.dot(s) / s.length()
          if (!best || Math.abs(score) > Math.abs(best.score)) best = { axis: a, score, s }
        }
        if (!best) return
        const c = view.state.cubies[st.pick.cubie]
        const layer = layerOf(c.pos[best.axis], view.n)
        if (!view.beginDrag(best.axis, layer)) return
        // distance of the grabbed point from the rotation axis (in cube units)
        const lp = local.clone()
        lp.setComponent(best.axis, 0)
        st.decided = true
        st.dir = best.s.clone().normalize()
        st.pxPerUnit = best.s.length() / 0.35
        st.radius = Math.max(0.6, lp.length())
        st.pick = { ...st.pick, axis: best.axis }
      }
      const proj = drag.dot(st.dir!)
      view.setDragAngle(proj / st.pxPerUnit! / st.radius!)
    }
    const up = (e: PointerEvent) => {
      if (!st || e.pointerId !== st.pointerId) return
      if (st.decided) view.endDrag()
      try {
        el.releasePointerCapture(e.pointerId)
      } catch {
        /* already released */
      }
      st = null
      setOrbit(true)
    }
    el.addEventListener('pointerdown', down, { capture: true })
    el.addEventListener('pointermove', move)
    el.addEventListener('pointerup', up)
    el.addEventListener('pointercancel', up)
    return () => {
      el.removeEventListener('pointerdown', down, { capture: true })
      el.removeEventListener('pointermove', move)
      el.removeEventListener('pointerup', up)
      el.removeEventListener('pointercancel', up)
    }
  }, [view, camera, gl, controls])
  return null
}

/** Pull the camera back on narrow (portrait) canvases so the cube never gets cropped. */
function FitCamera({ dist }: { dist: number }) {
  const { camera, size } = useThree()
  useEffect(() => {
    const aspect = size.width / Math.max(1, size.height)
    const want = dist * Math.max(1, 1.35 / aspect)
    camera.position.setLength(want)
    camera.updateProjectionMatrix()
  }, [camera, size.width, size.height, dist])
  return null
}

/** Studio lighting rig with soft reflections – shared by the play and learn stages. */
export function StudioLights({ dark }: { dark?: boolean }) {
  return (
    <>
      <ambientLight intensity={dark ? 0.25 : 0.45} />
      <directionalLight
        position={[4, 7, 5]}
        intensity={dark ? 1.6 : 2.1}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.02}
      />
      <directionalLight position={[-6, 2, -4]} intensity={dark ? 0.9 : 0.6} color={dark ? '#7fe0a4' : '#ffffff'} />
      <Environment resolution={256} frames={1}>
        <Lightformer form="rect" intensity={3} position={[0, 5, 2]} rotation-x={Math.PI / 2} scale={[8, 3, 1]} />
        <Lightformer form="rect" intensity={1.6} position={[-5, 1, 3]} rotation-y={Math.PI / 2.5} scale={[4, 6, 1]} />
        <Lightformer form="rect" intensity={1.2} position={[5, 2, -2]} rotation-y={-Math.PI / 2.5} scale={[4, 5, 1]} color="#d8ffe6" />
        <Lightformer form="ring" intensity={1.5} position={[0, 1, -6]} scale={3} color={dark ? '#3ddc84' : '#ffffff'} />
      </Environment>
    </>
  )
}

export interface CubeStageProps extends CubeProps {
  dark?: boolean
  className?: string
  cameraDistance?: number
  autoRotate?: boolean
  shadow?: boolean
}

/** A self-contained canvas with a single cube, studio lights and orbit controls. */
export function CubeStage({ dark, className, cameraDistance, autoRotate, shadow = true, ...cube }: CubeStageProps) {
  const size = cube.size ?? 3
  const dist = cameraDistance ?? size * 3.15
  return (
    <div className={className} style={{ touchAction: 'none' }}>
      <Canvas
        shadows
        dpr={[1, 2]}
        camera={{ position: [dist * 0.62, dist * 0.55, dist * 0.78], fov: 35 }}
        gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.05 }}
      >
        <FitCamera dist={dist} />
        <Suspense fallback={null}>
          <StudioLights dark={dark} />
          <CubeObject {...cube} size={size} />
          {shadow && (
            <ContactShadows position={[0, -size * 0.78, 0]} opacity={dark ? 0.7 : 0.45} scale={size * 4} blur={2.6} far={size * 1.5} />
          )}
        </Suspense>
        <OrbitControls
          makeDefault
          enablePan={false}
          enableDamping
          minDistance={size * 1.6}
          maxDistance={size * 5}
          autoRotate={autoRotate}
          autoRotateSpeed={0.8}
        />
      </Canvas>
    </div>
  )
}
