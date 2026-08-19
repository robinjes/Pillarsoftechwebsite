'use client'

import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef, useState, type RefObject } from 'react'
import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'

import { desktopVisualLabel, stages } from '@/components/site/workshopAssemblyData'

type ProgressTarget = { current: number }
type Vector3Tuple = [number, number, number]

const WORKSHOP_HEIGHT_CLASSES = 'min-h-[320vh] max-lg:min-h-[175vh] motion-reduce:min-h-screen'
const CASE_EXIT: Vector3Tuple = [-3.8, -2.45, -3.8]
const WHEEL_TARGETS: Array<[Vector3Tuple, number]> = [
  [[-2.34, 0.77, -1.08], 0.31],
  [[2.34, 0.77, -1.08], 0.39],
  [[-2.34, 0.77, 1.08], 0.47],
  [[2.34, 0.77, 1.08], 0.55],
]

const clamp01 = (value: number) => Math.min(1, Math.max(0, value))

const smoothstep = (start: number, end: number, value: number) => {
  const normalized = clamp01((value - start) / Math.max(0.0001, end - start))
  return normalized * normalized * (3 - 2 * normalized)
}

const damp = (current: number, target: number, lambda: number, delta: number) =>
  THREE.MathUtils.damp(current, target, lambda, delta)

function useScrollProgress(sectionRef: RefObject<HTMLElement | null>) {
  const target = useRef(0)

  useEffect(() => {
    const updateProgress = () => {
      const section = sectionRef.current
      if (!section) return

      const scrollableDistance = Math.max(1, section.offsetHeight - window.innerHeight)
      target.current = clamp01(-section.getBoundingClientRect().top / scrollableDistance)
    }

    updateProgress()
    window.addEventListener('scroll', updateProgress, { passive: true })
    window.addEventListener('resize', updateProgress)

    return () => {
      window.removeEventListener('scroll', updateProgress)
      window.removeEventListener('resize', updateProgress)
    }
  }, [sectionRef])

  return target
}

function stageForProgress(progress: number) {
  if (progress >= 0.72) return 2
  if (progress >= 0.34) return 1
  return 0
}

function useCurrentStage(progressTarget: ProgressTarget, reducedMotion: boolean) {
  const [stageIndex, setStageIndex] = useState(() => (reducedMotion ? 2 : 0))

  useEffect(() => {
    const updateStage = () => {
      const nextStage = stageForProgress(reducedMotion ? 1 : progressTarget.current)
      setStageIndex((currentStage) => (currentStage === nextStage ? currentStage : nextStage))
    }

    updateStage()
    window.addEventListener('scroll', updateStage, { passive: true })
    window.addEventListener('resize', updateStage)

    return () => {
      window.removeEventListener('scroll', updateStage)
      window.removeEventListener('resize', updateStage)
    }
  }, [progressTarget, reducedMotion])

  return stages[stageIndex].title
}

function EnvironmentLighting() {
  const { gl, scene } = useThree()

  useEffect(() => {
    const pmremGenerator = new THREE.PMREMGenerator(gl)
    const room = new RoomEnvironment()
    const environment = pmremGenerator.fromScene(room)
    scene.environment = environment.texture

    return () => {
      if (scene.environment === environment.texture) scene.environment = null
      environment.dispose()
      pmremGenerator.dispose()
      room.clear()
    }
  }, [gl, scene])

  return (
    <>
      <ambientLight intensity={0.55} color="#A9D8F2" />
      <hemisphereLight args={['#A9D8F2', '#0B1F3A', 0.7]} />
      <directionalLight
        castShadow
        position={[5, 9, 6]}
        intensity={2.4}
        color="#FFFDF8"
        shadow-mapSize-width={1536}
        shadow-mapSize-height={1536}
        shadow-bias={-0.0002}
      />
      <pointLight position={[-4, 3, 2]} intensity={20} distance={14} color="#2B5DA8" />
    </>
  )
}

function RoundedShell({
  size,
  radius = 0.12,
  segments = 3,
  color,
  metalness = 0.35,
  roughness = 0.42,
  position,
  castShadow = true,
  receiveShadow = true,
}: {
  size: Vector3Tuple
  radius?: number
  segments?: number
  color: string
  metalness?: number
  roughness?: number
  position?: Vector3Tuple
  castShadow?: boolean
  receiveShadow?: boolean
}) {
  const geometry = useMemo(
    () => new RoundedBoxGeometry(size[0], size[1], size[2], segments, radius),
    [radius, segments, size],
  )

  useEffect(() => () => geometry.dispose(), [geometry])

  return (
    <mesh castShadow={castShadow} receiveShadow={receiveShadow} position={position}>
      <primitive object={geometry} attach="geometry" />
      <meshStandardMaterial color={color} metalness={metalness} roughness={roughness} />
    </mesh>
  )
}

function Wheel() {
  return (
    <>
      <mesh castShadow receiveShadow rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.78, 0.78, 0.5, 32]} />
        <meshStandardMaterial color="#101114" metalness={0.72} roughness={0.32} />
      </mesh>
      <mesh castShadow position={[0.27, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.38, 0.38, 0.08, 24]} />
        <meshStandardMaterial color="#A9D8F2" metalness={0.82} roughness={0.22} />
      </mesh>
      <mesh castShadow position={[0.32, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.14, 0.14, 0.12, 20]} />
        <meshStandardMaterial color="#0B1F3A" metalness={0.82} roughness={0.18} />
      </mesh>
    </>
  )
}

function WheelGroup({ groupRef, final }: { groupRef: RefObject<THREE.Group | null>; final: boolean }) {
  return (
    <group ref={groupRef} scale={final ? 1 : 0.62}>
      <Wheel />
    </group>
  )
}

function RoverModel({ progressTarget, reducedMotion }: { progressTarget: ProgressTarget; reducedMotion: boolean }) {
  const assemblyRootRef = useRef<THREE.Group>(null)
  const caseRootRef = useRef<THREE.Group>(null)
  const lidRef = useRef<THREE.Group>(null)
  const roverRootRef = useRef<THREE.Group>(null)
  const chassisRef = useRef<THREE.Group>(null)
  const boardRef = useRef<THREE.Group>(null)
  const batteryRef = useRef<THREE.Group>(null)
  const sensorRef = useRef<THREE.Group>(null)
  const wheelFrontLeftRef = useRef<THREE.Group>(null)
  const wheelFrontRightRef = useRef<THREE.Group>(null)
  const wheelRearLeftRef = useRef<THREE.Group>(null)
  const wheelRearRightRef = useRef<THREE.Group>(null)
  const progress = useRef(0)
  const { size, camera } = useThree()
  const responsiveScale = Math.min(1.1, Math.max(0.62, size.width / (size.width < 700 ? 580 : 950)))

  useFrame((_, delta) => {
    const value = reducedMotion ? 1 : (progress.current = damp(progress.current, clamp01(progressTarget.current), 6, delta))
    const interpolate = (current: number, target: number, lambda: number) => (reducedMotion ? target : damp(current, target, lambda, delta))

    const lidOpen = smoothstep(0.02, 0.22, value)
    const chassisRise = smoothstep(0.18, 0.43, value)
    const boardAssembly = smoothstep(0.34, 0.63, value)
    const batteryAssembly = smoothstep(0.46, 0.73, value)
    const sensorAssembly = smoothstep(0.58, 0.84, value)
    const caseExit = smoothstep(0.28, 0.55, value)
    const finalSettle = smoothstep(0.82, 1, value)

    if (lidRef.current) {
      lidRef.current.rotation.x = interpolate(lidRef.current.rotation.x, -Math.PI * 0.52 * lidOpen, 8)
    }

    if (caseRootRef.current) {
      caseRootRef.current.position.x = interpolate(caseRootRef.current.position.x, THREE.MathUtils.lerp(0, CASE_EXIT[0], caseExit), 7)
      caseRootRef.current.position.y = interpolate(caseRootRef.current.position.y, THREE.MathUtils.lerp(0, CASE_EXIT[1], caseExit), 7)
      caseRootRef.current.position.z = interpolate(caseRootRef.current.position.z, THREE.MathUtils.lerp(0, CASE_EXIT[2], caseExit), 7)
      const caseScale = THREE.MathUtils.lerp(1, 0.001, caseExit)
      caseRootRef.current.scale.setScalar(interpolate(caseRootRef.current.scale.x, caseScale, 7))
    }

    if (chassisRef.current) {
      chassisRef.current.position.y = interpolate(chassisRef.current.position.y, THREE.MathUtils.lerp(0.85, 1.45, chassisRise), 8)
      chassisRef.current.scale.setScalar(interpolate(chassisRef.current.scale.x, THREE.MathUtils.lerp(0.76, 1, chassisRise), 8))
      chassisRef.current.rotation.z = interpolate(chassisRef.current.rotation.z, THREE.MathUtils.lerp(-0.08, 0, chassisRise), 8)
    }

    const wheelRefs = [wheelFrontLeftRef, wheelFrontRightRef, wheelRearLeftRef, wheelRearRightRef]
    WHEEL_TARGETS.forEach(([destination, start], index) => {
      const group = wheelRefs[index].current
      if (!group) return
      const wheelProgress = smoothstep(start, start + 0.22, value)
      group.position.x = interpolate(group.position.x, THREE.MathUtils.lerp(destination[0] * 0.38, destination[0], wheelProgress), 7)
      group.position.y = interpolate(group.position.y, THREE.MathUtils.lerp(0.92, destination[1], wheelProgress), 7)
      group.position.z = interpolate(group.position.z, THREE.MathUtils.lerp(destination[2] * 0.25, destination[2], wheelProgress), 7)
      group.rotation.y = interpolate(group.rotation.y, THREE.MathUtils.lerp(-0.32, 0, wheelProgress), 7)
      group.scale.setScalar(interpolate(group.scale.x, THREE.MathUtils.lerp(0.62, 1, wheelProgress), 7))
    })

    if (boardRef.current) {
      boardRef.current.position.y = interpolate(boardRef.current.position.y, THREE.MathUtils.lerp(0.92, 2.22, boardAssembly), 7)
      boardRef.current.position.z = interpolate(boardRef.current.position.z, THREE.MathUtils.lerp(-0.4, -0.16, boardAssembly), 7)
      boardRef.current.rotation.x = interpolate(boardRef.current.rotation.x, THREE.MathUtils.lerp(-0.18, 0, boardAssembly), 7)
    }

    if (batteryRef.current) {
      batteryRef.current.position.y = interpolate(batteryRef.current.position.y, THREE.MathUtils.lerp(0.88, 2.28, batteryAssembly), 7)
      batteryRef.current.position.x = interpolate(batteryRef.current.position.x, THREE.MathUtils.lerp(1.1, 0.72, batteryAssembly), 7)
      batteryRef.current.position.z = interpolate(batteryRef.current.position.z, THREE.MathUtils.lerp(0.12, 0.3, batteryAssembly), 7)
      batteryRef.current.rotation.z = interpolate(batteryRef.current.rotation.z, THREE.MathUtils.lerp(0.18, 0, batteryAssembly), 7)
    }

    if (sensorRef.current) {
      sensorRef.current.position.y = interpolate(sensorRef.current.position.y, THREE.MathUtils.lerp(0.9, 2.55, sensorAssembly), 7)
      sensorRef.current.position.z = interpolate(sensorRef.current.position.z, THREE.MathUtils.lerp(0.28, 1.45, sensorAssembly), 7)
      sensorRef.current.rotation.x = interpolate(sensorRef.current.rotation.x, THREE.MathUtils.lerp(-0.28, 0, sensorAssembly), 7)
      sensorRef.current.scale.setScalar(interpolate(sensorRef.current.scale.x, THREE.MathUtils.lerp(0.58, 1, sensorAssembly), 7))
    }

    if (assemblyRootRef.current) {
      const presentationScale = responsiveScale * THREE.MathUtils.lerp(1, 1.14, finalSettle)
      assemblyRootRef.current.scale.setScalar(interpolate(assemblyRootRef.current.scale.x, presentationScale, 5))
    }

    if (roverRootRef.current) {
      roverRootRef.current.rotation.y = interpolate(roverRootRef.current.rotation.y, finalSettle * 0.26, 2.2)
      roverRootRef.current.rotation.x = interpolate(roverRootRef.current.rotation.x, finalSettle * -0.025, 2.2)
    }

    const narrow = size.width < 700
    const baseCameraX = narrow ? 6.65 : 7.65
    const baseCameraZ = narrow ? 10.4 : 8.65
    camera.position.x = interpolate(camera.position.x, baseCameraX + finalSettle * 0.35, 2.5)
    camera.position.z = interpolate(camera.position.z, baseCameraZ - finalSettle * 0.08, 2.5)
    camera.position.y = interpolate(camera.position.y, narrow ? 5.45 : 5.15, 2.5)
    camera.lookAt(0, 1, 0)
  })

  return (
    <group ref={assemblyRootRef} scale={reducedMotion ? responsiveScale * 1.14 : 1}>
      <group ref={caseRootRef} position={reducedMotion ? CASE_EXIT : [0, 0, 0]} scale={reducedMotion ? 0.001 : 1}>
        <group>
          <RoundedShell size={[7.4, 0.64, 5.4]} radius={0.16} color="#08172D" metalness={0.62} roughness={0.4} position={[0, 0.32, 0]} />
          <RoundedShell size={[6.84, 0.2, 4.82]} radius={0.08} color="#173A66" metalness={0.16} roughness={0.7} position={[0, 0.7, 0]} />
          <RoundedShell size={[6.2, 0.12, 4.2]} radius={0.05} color="#101114" metalness={0.08} roughness={0.9} position={[0, 0.84, 0]} />
          <mesh castShadow position={[-2.65, 0.85, -1.55]}>
            <boxGeometry args={[0.9, 0.12, 0.34]} />
            <meshStandardMaterial color="#4D7FAF" metalness={0.15} roughness={0.52} />
          </mesh>
          <mesh castShadow position={[2.65, 0.85, 1.55]}>
            <boxGeometry args={[0.9, 0.12, 0.34]} />
            <meshStandardMaterial color="#4D7FAF" metalness={0.15} roughness={0.52} />
          </mesh>
        </group>

        <group ref={lidRef} position={[0, 0.72, -2.32]} rotation={reducedMotion ? [-Math.PI * 0.52, 0, 0] : [0, 0, 0]}>
          <RoundedShell size={[7.4, 0.48, 5.4]} radius={0.16} color="#08172D" metalness={0.62} roughness={0.4} position={[0, 0.24, 2.32]} />
          <RoundedShell size={[6.72, 0.11, 4.74]} radius={0.04} color="#173A66" metalness={0.18} roughness={0.68} position={[0, -0.02, 2.28]} />
          <RoundedShell size={[5.82, 0.08, 3.96]} radius={0.03} color="#4D7FAF" metalness={0.05} roughness={0.88} position={[0, -0.09, 2.16]} />
        </group>
      </group>

      <group ref={roverRootRef} rotation={reducedMotion ? [-0.025, 0.26, 0] : [0, 0, 0]}>
        <group ref={chassisRef} position={reducedMotion ? [0, 1.45, 0] : [0, 0.85, 0]} scale={reducedMotion ? 1 : 0.76} rotation={reducedMotion ? [0, 0, 0] : [0, 0, -0.08]}>
          <RoundedShell size={[4.45, 0.58, 2.82]} radius={0.16} color="#2B5DA8" metalness={0.72} roughness={0.3} />
          <RoundedShell size={[3.78, 0.2, 2.3]} radius={0.07} color="#A9D8F2" metalness={0.42} roughness={0.36} position={[0, 0.36, 0]} />
          <RoundedShell size={[3.35, 0.13, 1.86]} radius={0.05} color="#0B1F3A" metalness={0.6} roughness={0.34} position={[0, 0.68, -0.18]} />
          <mesh castShadow position={[0, 0.1, 1.48]}>
            <boxGeometry args={[3.9, 0.12, 0.22]} />
            <meshStandardMaterial color="#D5EAF5" metalness={0.35} roughness={0.32} />
          </mesh>
        </group>

        <mesh castShadow position={[0, 0.9, -1.08]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.12, 0.12, 4.8, 16]} />
          <meshStandardMaterial color="#173A66" metalness={0.8} roughness={0.28} />
        </mesh>
        <mesh castShadow position={[0, 0.9, 1.08]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.12, 0.12, 4.8, 16]} />
          <meshStandardMaterial color="#173A66" metalness={0.8} roughness={0.28} />
        </mesh>

        <WheelGroup groupRef={wheelFrontLeftRef} final={reducedMotion} />
        <WheelGroup groupRef={wheelFrontRightRef} final={reducedMotion} />
        <WheelGroup groupRef={wheelRearLeftRef} final={reducedMotion} />
        <WheelGroup groupRef={wheelRearRightRef} final={reducedMotion} />

        <group ref={boardRef} position={reducedMotion ? [0, 2.22, -0.16] : [0, 0.92, -0.4]} rotation={reducedMotion ? [0, 0, 0] : [-0.18, 0, 0]}>
          <RoundedShell size={[3.44, 0.16, 2.08]} radius={0.08} color="#3C9A7C" metalness={0.3} roughness={0.42} />
          <mesh castShadow position={[-0.9, 0.14, -0.42]}>
            <boxGeometry args={[0.42, 0.18, 0.34]} />
            <meshStandardMaterial color="#101114" metalness={0.72} roughness={0.26} />
          </mesh>
          <mesh castShadow position={[0.45, 0.14, -0.4]}>
            <boxGeometry args={[0.56, 0.18, 0.3]} />
            <meshStandardMaterial color="#D5EAF5" metalness={0.28} roughness={0.36} />
          </mesh>
          <mesh castShadow position={[0.82, 0.14, 0.42]}>
            <boxGeometry args={[0.32, 0.18, 0.4]} />
            <meshStandardMaterial color="#0B1F3A" metalness={0.64} roughness={0.3} />
          </mesh>
        </group>

        <group ref={batteryRef} position={reducedMotion ? [0.72, 2.28, 0.3] : [1.1, 0.88, 0.12]} rotation={reducedMotion ? [0, 0, 0] : [0, 0, 0.18]}>
          <RoundedShell size={[2.2, 0.46, 1.08]} radius={0.12} color="#D5EAF5" metalness={0.24} roughness={0.4} />
          <RoundedShell size={[1.28, 0.1, 0.7]} radius={0.04} color="#4D7FAF" metalness={0.46} roughness={0.3} position={[0, 0.28, 0]} />
          <mesh castShadow position={[-0.58, 0.3, 0]}>
            <boxGeometry args={[0.12, 0.12, 0.18]} />
            <meshStandardMaterial color="#C94F5A" metalness={0.42} roughness={0.3} />
          </mesh>
          <mesh castShadow position={[0.58, 0.3, 0]}>
            <boxGeometry args={[0.12, 0.12, 0.18]} />
            <meshStandardMaterial color="#3C9A7C" metalness={0.42} roughness={0.3} />
          </mesh>
        </group>

        <group ref={sensorRef} position={reducedMotion ? [0, 2.55, 1.45] : [0, 0.9, 0.28]} rotation={reducedMotion ? [0, 0, 0] : [-0.28, 0, 0]} scale={reducedMotion ? 1 : 0.58}>
          <RoundedShell size={[1.42, 0.3, 0.5]} radius={0.1} color="#173A66" metalness={0.64} roughness={0.3} position={[0, 0, -0.05]} />
          <mesh castShadow position={[-0.3, 0.05, 0.27]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.22, 0.22, 0.14, 32]} />
            <meshStandardMaterial color="#D5EAF5" metalness={0.78} roughness={0.2} />
          </mesh>
          <mesh castShadow position={[0.3, 0.05, 0.27]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.22, 0.22, 0.14, 32]} />
            <meshStandardMaterial color="#D5EAF5" metalness={0.78} roughness={0.2} />
          </mesh>
          <mesh position={[-0.3, 0.05, 0.36]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.1, 0.1, 0.15, 24]} />
            <meshStandardMaterial color="#101114" metalness={0.82} roughness={0.18} />
          </mesh>
          <mesh position={[0.3, 0.05, 0.36]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.1, 0.1, 0.15, 24]} />
            <meshStandardMaterial color="#101114" metalness={0.82} roughness={0.18} />
          </mesh>
          <mesh castShadow position={[0, -0.24, 0]}>
            <boxGeometry args={[0.18, 0.45, 0.18]} />
            <meshStandardMaterial color="#2B5DA8" metalness={0.7} roughness={0.28} />
          </mesh>
        </group>
      </group>
    </group>
  )
}

function Ground() {
  return (
    <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.03, 0]}>
      <planeGeometry args={[28, 28]} />
      <meshStandardMaterial color="#08172D" metalness={0.12} roughness={0.84} />
    </mesh>
  )
}

function WorkshopCanvas({ progressTarget, reducedMotion, isMobile }: { progressTarget: ProgressTarget; reducedMotion: boolean; isMobile: boolean }) {
  return (
    <Canvas
      shadows="basic"
      dpr={isMobile ? 1 : [1, 1.5]}
      camera={{
        position: reducedMotion ? [7.95, 5.15, 8.57] : [7.65, 5.15, 8.65],
        fov: 38,
        near: 0.1,
        far: 100,
      }}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping
        gl.outputColorSpace = THREE.SRGBColorSpace
        gl.toneMappingExposure = 1.15
      }}
      fallback={<p className="p-8 text-sm text-warm">This interactive workshop scene needs WebGL enabled.</p>}
    >
      <EnvironmentLighting />
      <RoverModel progressTarget={progressTarget} reducedMotion={reducedMotion} />
      <Ground />
    </Canvas>
  )
}

function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(() => typeof window !== 'undefined' && window.matchMedia(query).matches)

  useEffect(() => {
    const mediaQuery = window.matchMedia(query)
    const update = () => setMatches(mediaQuery.matches)
    update()
    mediaQuery.addEventListener('change', update)
    return () => mediaQuery.removeEventListener('change', update)
  }, [query])

  return matches
}

export default function WorkshopAssemblyDesktop() {
  const sectionRef = useRef<HTMLElement>(null)
  const progressTarget = useScrollProgress(sectionRef)
  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)')
  const isMobile = useMediaQuery('(max-width: 1023px)')
  const currentStage = useCurrentStage(progressTarget, reducedMotion)

  return (
    <section ref={sectionRef} className={`relative overflow-clip bg-midnight text-warm ${WORKSHOP_HEIGHT_CLASSES}`} aria-labelledby="workshop-heading">
      <div className="sticky top-[4.75rem] min-h-[calc(100svh-4.75rem)] overflow-hidden">
        <div className="absolute inset-0 bg-midnight">
          <div className="absolute inset-0" role="img" aria-label={desktopVisualLabel}>
            <WorkshopCanvas progressTarget={progressTarget} reducedMotion={reducedMotion} isMobile={isMobile} />
          </div>
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_68%_48%,transparent_0%,rgba(11,31,58,0.08)_38%,rgba(11,31,58,0.6)_100%)]" aria-hidden="true" />
        </div>

        <div className="site-shell relative z-10 mx-auto flex min-h-[calc(100svh-4.75rem)] flex-col justify-between px-5 py-10 sm:px-8 sm:py-14 lg:px-10 lg:py-16">
          <div className="max-w-xl">
            <p className="font-display text-xs font-bold uppercase tracking-[0.2em] text-sky">Workshop assembly</p>
            <h2 id="workshop-heading" className="display-heading mt-4 max-w-md text-4xl text-warm sm:text-5xl lg:text-6xl">
              Open it. Build it. Pass it on.
            </h2>
            <p className="mt-6 max-w-sm text-base leading-7 text-warm/70 sm:text-lg">
              Scroll to turn a box of parts into a project a student can lead.
            </p>
          </div>

          <p className="max-w-xl font-display text-sm font-semibold text-sky" aria-live="polite">
            {currentStage}
          </p>
        </div>
      </div>
    </section>
  )
}
