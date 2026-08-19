'use client'

import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useEffect, useRef, useState, type RefObject } from 'react'
import * as THREE from 'three'
import { GLTFLoader, type GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'

import { desktopVisualLabel, stages } from '@/components/site/workshopAssemblyData'

type ProgressTarget = { current: number }
type StageIndex = 0 | 1 | 2 | 3
type Vector3Tuple = [number, number, number]

const WORKSHOP_HEIGHT_CLASSES = 'min-h-[320vh] max-lg:min-h-[175vh] motion-reduce:min-h-screen'

const stageForProgress = (progress: number): StageIndex => {
  if (progress >= 0.72) return 3
  if (progress >= 0.5) return 2
  if (progress >= 0.28) return 1
  return 0
}

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

function useCurrentStage(progressTarget: ProgressTarget, reducedMotion: boolean) {
  const [stageIndex, setStageIndex] = useState<StageIndex>(() => (reducedMotion ? 3 : 0))

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
      <ambientLight intensity={0.48} color="#A9D8F2" />
      <hemisphereLight args={['#A9D8F2', '#08172D', 0.65]} />
      <directionalLight
        castShadow
        position={[5, 8, 6]}
        intensity={2.25}
        color="#FFFDF8"
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-bias={-0.0002}
      />
      <pointLight position={[-4, 3, 3]} intensity={15} distance={16} color="#2B5DA8" />
    </>
  )
}

type TransformSnapshot = {
  node: THREE.Object3D
  position: THREE.Vector3
  quaternion: THREE.Quaternion
  scale: THREE.Vector3
  offset: THREE.Vector3
  explodedRotation: THREE.Quaternion
  targetPosition: THREE.Vector3
  targetQuaternion: THREE.Quaternion
}

type AssemblyPlan = {
  names: string[]
  start: number
  end: number
  offset: Vector3Tuple
  rotation: Vector3Tuple
}

const ASSEMBLY_PLANS: AssemblyPlan[] = [
  {
    names: ['Body', 'Body_Parts', 'Body_Parts.001', 'base'],
    start: 0.08,
    end: 0.34,
    offset: [-0.55, 0.45, 0.24],
    rotation: [0.14, -0.12, 0.1],
  },
  {
    names: ['Wheels_objs', 'suspension', 'Body.002', 'Body.003'],
    start: 0.28,
    end: 0.56,
    offset: [0.72, -0.24, 0.46],
    rotation: [-0.12, 0.2, 0.05],
  },
  {
    names: ['head', 'Mastcam_Z_cams', 'NavCams', 'antenna_uhf', 'antenna_hg', 'antenna_lg', 'lab', 'hazcams_front', 'hazcams_rear'],
    start: 0.5,
    end: 0.78,
    offset: [-0.38, 0.72, -0.58],
    rotation: [0.2, -0.22, 0.12],
  },
  {
    names: ['arm', 'arm.001', 'arm.003', 'arm_01_joint', 'arm_02_joint', 'rtg', 'Name_Chips'],
    start: 0.7,
    end: 0.94,
    offset: [0.7, 0.42, 0.62],
    rotation: [-0.24, 0.28, -0.16],
  },
]

function prepareModel(scene: THREE.Group) {
  const bounds = new THREE.Box3().setFromObject(scene)
  const center = bounds.getCenter(new THREE.Vector3())
  const size = bounds.getSize(new THREE.Vector3())
  const scale = 4.8 / Math.max(size.x, size.y, size.z, 0.001)

  scene.scale.setScalar(scale)
  scene.position.set(-center.x * scale, -bounds.min.y * scale, -center.z * scale)

  scene.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return
    object.castShadow = true
    object.receiveShadow = true
    const materials = Array.isArray(object.material) ? object.material : [object.material]
    for (const material of materials) {
      if ('envMapIntensity' in material) material.envMapIntensity = 1.15
    }
  })

  const snapshots: TransformSnapshot[] = []
  const seen = new Set<string>()
  for (const plan of ASSEMBLY_PLANS) {
    for (const name of plan.names) {
      const node = scene.getObjectByName(name)
      if (!node || seen.has(node.uuid)) continue
      seen.add(node.uuid)
      snapshots.push({
        node,
        position: node.position.clone(),
        quaternion: node.quaternion.clone(),
        scale: node.scale.clone(),
        offset: new THREE.Vector3(...plan.offset),
        explodedRotation: new THREE.Quaternion().setFromEuler(new THREE.Euler(...plan.rotation)),
        targetPosition: new THREE.Vector3(),
        targetQuaternion: new THREE.Quaternion(),
      })
      node.userData.workshopRange = [plan.start, plan.end]
    }
  }

  return { scene, snapshots }
}

function usePerseveranceModel() {
  const [model, setModel] = useState<{ scene: THREE.Group; snapshots: TransformSnapshot[] } | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const loader = new GLTFLoader()

    loader.load(
      '/models/perseverance/perseverance-runtime.glb',
      (gltf: GLTF) => {
        if (cancelled) return
        setModel(prepareModel(gltf.scene))
      },
      undefined,
      () => {
        if (!cancelled) setError('The rover reference model could not be loaded.')
      },
    )

    return () => {
      cancelled = true
    }
  }, [])

  return { model, error }
}

function PerseveranceModel({
  model,
  progressTarget,
  reducedMotion,
}: {
  model: { scene: THREE.Group; snapshots: TransformSnapshot[] }
  progressTarget: ProgressTarget
  reducedMotion: boolean
}) {
  const presentationRef = useRef<THREE.Group>(null)
  const progress = useRef(reducedMotion ? 1 : 0)
  const { size, camera } = useThree()

  useFrame((_, delta) => {
    const value = reducedMotion ? 1 : (progress.current = damp(progress.current, clamp01(progressTarget.current), 6, delta))
    const interpolation = reducedMotion ? 1 : 1 - Math.exp(-10 * delta)

    for (const plan of ASSEMBLY_PLANS) {
      const assemblyProgress = reducedMotion ? 1 : smoothstep(plan.start, plan.end, value)
      const explodedAmount = 1 - assemblyProgress

      for (const snapshot of model.snapshots) {
        if (snapshot.node.userData.workshopRange?.[0] !== plan.start || snapshot.node.userData.workshopRange?.[1] !== plan.end) continue

        snapshot.targetPosition.copy(snapshot.position).addScaledVector(snapshot.offset, explodedAmount)
        snapshot.targetQuaternion.copy(snapshot.quaternion)
        if (explodedAmount > 0) snapshot.targetQuaternion.multiply(snapshot.explodedRotation)

        if (reducedMotion) {
          snapshot.node.position.copy(snapshot.targetPosition)
          snapshot.node.quaternion.copy(snapshot.targetQuaternion)
          snapshot.node.scale.copy(snapshot.scale)
        } else {
          snapshot.node.position.lerp(snapshot.targetPosition, interpolation)
          snapshot.node.quaternion.slerp(snapshot.targetQuaternion, interpolation)
        }
      }
    }

    if (presentationRef.current) {
      const responsiveScale = size.width < 700
        ? Math.min(0.66, Math.max(0.52, size.width / 690))
        : Math.min(1.08, Math.max(0.68, size.width / 900))
      const finalSettle = smoothstep(0.8, 1, value)
      presentationRef.current.scale.setScalar(reducedMotion ? responsiveScale : damp(presentationRef.current.scale.x, responsiveScale, 4, delta))
      presentationRef.current.rotation.y = reducedMotion ? 0.22 : damp(presentationRef.current.rotation.y, finalSettle * 0.22, 2.4, delta)
      presentationRef.current.rotation.x = reducedMotion ? -0.02 : damp(presentationRef.current.rotation.x, finalSettle * -0.02, 2.4, delta)
    }

    const narrow = size.width < 700
    const finalOrbit = smoothstep(0.78, 1, value)
    const cameraX = narrow ? 5.7 : 6.1
    const cameraZ = narrow ? 8.2 : 7.4
    const cameraTargetX = cameraX + finalOrbit * 0.34
    const cameraTargetZ = cameraZ - finalOrbit * 0.18
    if (reducedMotion) {
      camera.position.set(cameraX + 0.34, narrow ? 4.25 : 4.05, cameraZ - 0.18)
    } else {
      camera.position.x = damp(camera.position.x, cameraTargetX, 2.5, delta)
      camera.position.z = damp(camera.position.z, cameraTargetZ, 2.5, delta)
      camera.position.y = damp(camera.position.y, narrow ? 4.25 : 4.05, 2.5, delta)
    }
    camera.lookAt(0, 1.3, 0)
  })

  return <group ref={presentationRef}><primitive object={model.scene} /></group>
}

function Ground() {
  return (
    <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.015, 0]}>
      <planeGeometry args={[24, 24]} />
      <meshStandardMaterial color="#071327" metalness={0.1} roughness={0.86} />
    </mesh>
  )
}

function WorkshopCanvas({
  progressTarget,
  reducedMotion,
  isMobile,
}: {
  progressTarget: ProgressTarget
  reducedMotion: boolean
  isMobile: boolean
}) {
  const { model, error } = usePerseveranceModel()

  return (
    <>
      <Canvas
        shadows={isMobile ? false : 'basic'}
        dpr={isMobile ? 1 : [1, 1.5]}
        camera={{ position: [6.1, 4.05, 7.4], fov: 38, near: 0.1, far: 100 }}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
        onCreated={({ gl }) => {
          gl.toneMapping = THREE.ACESFilmicToneMapping
          gl.outputColorSpace = THREE.SRGBColorSpace
          gl.toneMappingExposure = 1.1
        }}
        fallback={<p className="p-8 text-sm text-warm">This interactive rover reference needs WebGL enabled.</p>}
      >
        <EnvironmentLighting />
        {model ? <PerseveranceModel model={model} progressTarget={progressTarget} reducedMotion={reducedMotion} /> : null}
        <Ground />
      </Canvas>
      {!model && !error ? (
        <p className="pointer-events-none absolute inset-x-0 top-1/2 z-20 -translate-y-1/2 px-6 text-center font-display text-xs font-semibold uppercase tracking-[0.16em] text-warm/55" role="status">
          Preparing the rover reference
        </p>
      ) : null}
      {error ? <p className="absolute inset-x-0 bottom-8 z-20 px-6 text-center text-xs text-warm/70" role="status">{error}</p> : null}
    </>
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
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_67%_48%,transparent_0%,rgba(11,31,58,0.08)_38%,rgba(11,31,58,0.68)_100%)]" aria-hidden="true" />
        </div>

        <div className="site-shell relative z-10 mx-auto flex min-h-[calc(100svh-4.75rem)] flex-col justify-between px-5 py-10 sm:px-8 sm:py-14 lg:px-10 lg:py-16">
          <div className="max-w-xl">
            <p className="font-display text-xs font-bold uppercase tracking-[0.2em] text-sky">Workshop assembly</p>
            <h2 id="workshop-heading" className="display-heading mt-4 max-w-md text-4xl text-warm sm:text-5xl lg:text-6xl">
              Every part has a purpose.
            </h2>
            <p className="mt-6 max-w-sm text-base leading-7 text-warm/70 sm:text-lg">
              Scroll to bring a working rover together, one system at a time.
            </p>
          </div>

          <div className="max-w-xl">
            <p className="font-display text-sm font-semibold tracking-[0.12em] text-sky" aria-live="polite">{currentStage}</p>
            <p className="mt-3 text-[0.65rem] uppercase tracking-[0.16em] text-warm/50">Reference model · NASA/JPL-Caltech · no endorsement</p>
          </div>
        </div>
      </div>
    </section>
  )
}
