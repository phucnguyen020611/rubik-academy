import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { ContactShadows, OrbitControls } from '@react-three/drei'
import { Suspense, useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { StudioLights } from '../cube/CubeCanvas'
import { turnPieces } from './twisty'
import { TwistyView } from './TwistyView'
import type { PuzzleEntry } from './registry'

function TwistyObject({ entry, speed, onReady, onMove, appear }: { entry: PuzzleEntry; speed: number; onReady?: (v: TwistyView) => void; onMove?: (label: string, solved: boolean) => void; appear?: number }) {
  const view = useMemo(() => new TwistyView(entry.def, entry.build, entry.centre, entry.core?.()), [entry])
  const pop = useRef(0)
  useEffect(() => () => view.dispose(), [view])
  useEffect(() => {
    view.speed = speed
  }, [view, speed])
  useEffect(() => {
    onReady?.(view)
  }, [view, onReady])
  useEffect(() => {
    if (!onMove) return
    view.listeners.add(onMove)
    return () => void view.listeners.delete(onMove)
  }, [view, onMove])
  useEffect(() => {
    pop.current = 0
  }, [appear, view])
  useFrame((_, dt) => {
    view.update(Math.min(dt, 0.05))
    if (pop.current < 1) {
      pop.current = Math.min(1, pop.current + dt / 0.6)
      const x = pop.current
      const c = 1.70158
      view.group.scale.setScalar(Math.max(0.001, 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2)))
    }
  })
  return (
    <>
      <primitive object={view.group} />
      <TwistyDrag view={view} />
    </>
  )
}

/** Drag on a piece to turn the layer under the pointer; drag elsewhere to orbit. */
function TwistyDrag({ view }: { view: TwistyView }) {
  const { camera, gl, controls } = useThree()
  useEffect(() => {
    const el = gl.domElement
    const ray = new THREE.Raycaster()
    let st: null | {
      x: number
      y: number
      pick: NonNullable<ReturnType<TwistyView['pick']>>
      pointerId: number
      decided: boolean
      dir?: THREE.Vector2
      scale?: number
    } = null
    const rect = () => el.getBoundingClientRect()
    const ndc = (e: PointerEvent) => {
      const r = rect()
      return new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1)
    }
    const toScreen = (p: THREE.Vector3) => {
      const r = rect()
      const w = view.content.localToWorld(p.clone()).project(camera)
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
      e.stopImmediatePropagation()
      if (view.busy) return
      setOrbit(false)
      el.setPointerCapture(e.pointerId)
      st = { x: e.clientX, y: e.clientY, pick, pointerId: e.pointerId, decided: false }
    }
    const move = (e: PointerEvent) => {
      if (!st || e.pointerId !== st.pointerId) return
      const drag = new THREE.Vector2(e.clientX - st.x, e.clientY - st.y)
      if (!st.decided) {
        if (drag.length() < 7) return
        const { piece, point, normal } = st.pick
        const p0 = toScreen(point)
        let best: { turn: string; score: number; s: THREE.Vector2; count: number; radius: number } | null = null
        for (const [name, t] of Object.entries(view.def.turns)) {
          if (t.min < -50) continue // whole-puzzle rotations are for the buttons
          const axis = new THREE.Vector3(...t.axis).normalize()
          if (Math.abs(axis.dot(normal)) > 0.6) continue
          const pieces = turnPieces(view.def, view.state, name)
          if (!pieces.includes(piece)) continue
          const along = axis.clone().multiplyScalar(point.dot(axis))
          const arm = point.clone().sub(along)
          const radius = arm.length()
          if (radius < 1e-3) continue
          const tangent = new THREE.Vector3().crossVectors(axis, arm).normalize()
          const s = toScreen(point.clone().addScaledVector(tangent, 0.3)).sub(p0)
          if (s.length() < 1e-3) continue
          const score = drag.dot(s) / s.length()
          const better =
            !best ||
            Math.abs(score) > Math.abs(best.score) * 1.02 ||
            (Math.abs(score) > Math.abs(best.score) * 0.98 && pieces.length < best.count)
          if (better) best = { turn: name, score, s, count: pieces.length, radius }
        }
        if (!best || !view.beginDrag(best.turn)) return
        st.decided = true
        // positive drag along s = anticlockwise about the axis
        st.dir = best.s.clone().normalize()
        st.scale = 1 / (best.s.length() / 0.3) / Math.max(0.6, best.radius)
      }
      view.setDragAngle(drag.dot(st.dir!) * st.scale!)
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

function Fit({ dist }: { dist: number }) {
  const { camera, size } = useThree()
  useEffect(() => {
    camera.position.setLength(dist * Math.max(1, 1.35 / (size.width / Math.max(1, size.height))))
    camera.updateProjectionMatrix()
  }, [camera, size.width, size.height, dist])
  return null
}

export function TwistyStage({ entry, dark, speed, onReady, onMove, appear, className }: { entry: PuzzleEntry; dark?: boolean; speed: number; onReady?: (v: TwistyView) => void; onMove?: (label: string, solved: boolean) => void; appear?: number; className?: string }) {
  const dist = entry.size * 3.25
  return (
    <div className={className} style={{ touchAction: 'none' }}>
      <Canvas shadows dpr={[1, 2]} camera={{ position: [dist * 0.62, dist * 0.55, dist * 0.78], fov: 35 }} gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.05 }}>
        <Fit dist={dist} />
        <Suspense fallback={null}>
          <StudioLights dark={dark} />
          <TwistyObject key={entry.id} entry={entry} speed={speed} onReady={onReady} onMove={onMove} appear={appear} />
          <ContactShadows position={[0, -entry.size * 0.78, 0]} opacity={dark ? 0.7 : 0.45} scale={entry.size * 4} blur={2.6} far={entry.size * 1.5} />
        </Suspense>
        <OrbitControls makeDefault enablePan={false} enableDamping minDistance={entry.size * 1.6} maxDistance={entry.size * 5} />
      </Canvas>
    </div>
  )
}
