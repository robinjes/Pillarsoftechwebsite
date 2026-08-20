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
type AssemblyStage = 'FRAME' | 'MOTION' | 'SENSE' | 'LEAD'

const WORKSHOP_HEIGHT_CLASSES = 'min-h-[320vh] max-lg:min-h-[175vh] motion-reduce:min-h-screen'

const stageForProgress = (progress: number): StageIndex => {
  if (progress >= 0.72) return 3
  if (progress >= 0.5) return 2
  if (progress >= 0.28) return 1
  return 0
}

const clamp01 = (value: number) => Math.min(1, Math.max(0, value))

const quinticEase = (start: number, end: number, value: number) => {
  const normalized = clamp01((value - start) / Math.max(0.0001, end - start))
  return normalized * normalized * normalized * (normalized * (normalized * 6 - 15) + 10)
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
  const [isReady, setIsReady] = useState(reducedMotion)

  useEffect(() => {
    const updateStage = () => {
      const currentProgress = reducedMotion ? 1 : progressTarget.current
      const nextStage = stageForProgress(currentProgress)
      setStageIndex((currentStage) => (currentStage === nextStage ? currentStage : nextStage))
      setIsReady((currentReady) => {
        const nextReady = currentProgress >= 0.82
        return currentReady === nextReady ? currentReady : nextReady
      })
    }

    updateStage()
    window.addEventListener('scroll', updateStage, { passive: true })
    window.addEventListener('resize', updateStage)

    return () => {
      window.removeEventListener('scroll', updateStage)
      window.removeEventListener('resize', updateStage)
    }
  }, [progressTarget, reducedMotion])

  return { index: stageIndex, title: stages[stageIndex].title, isReady }
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
  start: number
  end: number
  targetPosition: THREE.Vector3
  targetQuaternion: THREE.Quaternion
}

type AssemblyPlan = {
  name: string
  stage: AssemblyStage
  start: number
  end: number
  offset: Vector3Tuple
  rotation: Vector3Tuple
}

const makeAssemblyPlans = (
  stage: AssemblyStage,
  names: string[],
  start: number,
  stagger: number,
  duration: number,
  direction: Vector3Tuple,
  rotation: Vector3Tuple,
): AssemblyPlan[] => names.map((name, index) => {
  // Stable, restrained variation keeps a system coherent without making every unit move identically.
  const lateral = ((index % 3) - 1) * 0.075
  const vertical = (index % 2 === 0 ? 1 : -1) * 0.045
  const depth = (((index + 1) % 3) - 1) * 0.06
  const tilt = ((index % 3) - 1) * 0.022

  return {
    name,
    stage,
    start: start + index * stagger,
    end: start + index * stagger + duration,
    offset: [direction[0] + lateral, direction[1] + vertical, direction[2] + depth],
    rotation: [rotation[0] + tilt, rotation[1] - tilt * 0.7, rotation[2] + tilt * 0.5],
  }
})

const ASSEMBLY_PLANS: AssemblyPlan[] = [
  ...makeAssemblyPlans('FRAME', ['Body', 'Body_Parts', 'Body_Parts.001', 'base', 'box', 'part_01', 'Armature', 'Empty'], 0.05, 0.018, 0.23, [-0.42, 0.34, 0.28], [0.08, -0.1, 0.06]),
  ...makeAssemblyPlans('MOTION', ['suspension', 'Wheels_objs', 'Body.002', 'Body.003'], 0.2, 0.035, 0.24, [0.46, -0.2, 0.38], [-0.08, 0.13, 0.04]),
  ...makeAssemblyPlans('SENSE', ['Cylinder', 'lab', 'rtg', 'antenna_uhf', 'antenna_hg', 'antenna_lg', 'RIMFAX', 'hazcams_front', 'hazcams_front_cover', 'hazcams_rear', 'hazcams_rear_cover_l', 'hazcams_rear_cover_r', 'hazcams_rear_wiring', 'microphones', 'Up_Look_Camera', 'Down_Look_Camera', 'calibration_target', 'calibration_target_bracket'], 0.34, 0.014, 0.24, [-0.32, 0.52, -0.42], [0.12, -0.16, 0.08]),
  ...makeAssemblyPlans('LEAD', ['arm.001', 'arm.003', 'arm_01_joint', 'arm_02_joint', 'pan_end cover', 'arm_cable_etc', 'Name_Chips', 'probe'], 0.48, 0.018, 0.21, [0.42, 0.3, 0.5], [-0.12, 0.18, -0.1]),
]

function setAssemblyState(snapshot: TransformSnapshot, progress: number) {
  const assemblyBlend = quinticEase(snapshot.start, snapshot.end, progress)
  const explodedAmount = 1 - assemblyBlend
  snapshot.targetPosition.copy(snapshot.position).addScaledVector(snapshot.offset, explodedAmount)
  snapshot.targetQuaternion.copy(snapshot.quaternion)
  if (explodedAmount > 0) snapshot.targetQuaternion.multiply(snapshot.explodedRotation)
}

function prepareModel(scene: THREE.Group, initialProgress: number) {
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
    const node = scene.getObjectByName(plan.name)
    // Only animate independent scene roots; never move a selected child of another selected unit.
    if (!node || node.parent !== scene || seen.has(node.uuid)) continue
    seen.add(node.uuid)
    const snapshot: TransformSnapshot = {
      node,
      position: node.position.clone(),
      quaternion: node.quaternion.clone(),
      scale: node.scale.clone(),
      offset: new THREE.Vector3(...plan.offset),
      explodedRotation: new THREE.Quaternion().setFromEuler(new THREE.Euler(...plan.rotation)),
      start: plan.start,
      end: plan.end,
      targetPosition: new THREE.Vector3(),
      targetQuaternion: new THREE.Quaternion(),
    }
    setAssemblyState(snapshot, initialProgress)
    node.position.copy(snapshot.targetPosition)
    node.quaternion.copy(snapshot.targetQuaternion)
    snapshots.push(snapshot)
  }

  return { scene, snapshots }
}

function usePerseveranceModel(progressTarget: ProgressTarget, reducedMotion: boolean) {
  const [model, setModel] = useState<{ scene: THREE.Group; snapshots: TransformSnapshot[] } | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const loader = new GLTFLoader()

    loader.load(
      '/models/perseverance/perseverance-runtime.glb',
      (gltf: GLTF) => {
        if (cancelled) return
        setModel(prepareModel(gltf.scene, reducedMotion ? 1 : clamp01(progressTarget.current)))
      },
      undefined,
      () => {
        if (!cancelled) setError('The rover reference model could not be loaded.')
      },
    )

    return () => {
      cancelled = true
    }
  }, [progressTarget, reducedMotion])

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
  const progress = useRef(reducedMotion ? 1 : clamp01(progressTarget.current))
  const idleSpinAngle = useRef(0)
  const idleSpinVelocity = useRef(0)
  const { size, camera } = useThree()

  useFrame((_, delta) => {
    const value = reducedMotion ? 1 : (progress.current = damp(progress.current, clamp01(progressTarget.current), 6, delta))
    const interpolation = reducedMotion ? 1 : 1 - Math.exp(-7 * delta)

    for (const snapshot of model.snapshots) {
      setAssemblyState(snapshot, value)

      if (reducedMotion) {
        snapshot.node.position.copy(snapshot.targetPosition)
        snapshot.node.quaternion.copy(snapshot.targetQuaternion)
        snapshot.node.scale.copy(snapshot.scale)
      } else {
        snapshot.node.position.lerp(snapshot.targetPosition, interpolation)
        snapshot.node.quaternion.slerp(snapshot.targetQuaternion, interpolation)
      }
    }

    const spinBlend = reducedMotion ? 0 : quinticEase(0.8, 0.88, value)
    const targetSpinVelocity = spinBlend * ((Math.PI * 2) / 24)
    if (reducedMotion) {
      idleSpinAngle.current = 0
      idleSpinVelocity.current = 0
    } else {
      // The velocity damps to zero on reverse scroll; the accumulated angle keeps the rover in view.
      idleSpinVelocity.current = damp(idleSpinVelocity.current, targetSpinVelocity, 3.8, delta)
      idleSpinAngle.current += idleSpinVelocity.current * delta
    }

    if (presentationRef.current) {
      const responsiveScale = size.width < 700
        ? Math.min(0.66, Math.max(0.52, size.width / 690))
        : Math.min(1.08, Math.max(0.68, size.width / 900))
      const finalSettle = quinticEase(0.8, 1, value)
      presentationRef.current.scale.setScalar(reducedMotion ? responsiveScale : damp(presentationRef.current.scale.x, responsiveScale, 4, delta))
      presentationRef.current.rotation.y = reducedMotion
        ? 0.22
        : damp(presentationRef.current.rotation.y, finalSettle * 0.22 + idleSpinAngle.current, 2.8, delta)
      presentationRef.current.rotation.x = reducedMotion ? -0.02 : damp(presentationRef.current.rotation.x, finalSettle * -0.02, 2.4, delta)
    }

    const narrow = size.width < 700
    const finalOrbit = quinticEase(0.78, 1, value)
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
  const { model, error } = usePerseveranceModel(progressTarget, reducedMotion)

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
          <div className="workshop-registration-layer pointer-events-none absolute inset-5 z-10 sm:inset-8" aria-hidden="true">
            <span className="workshop-registration-mark workshop-registration-mark--top-left" />
            <span className="workshop-registration-mark workshop-registration-mark--top-right" />
            <span className="workshop-registration-mark workshop-registration-mark--bottom-left" />
            <span className="workshop-registration-mark workshop-registration-mark--bottom-right" />
            <span className="workshop-cut-mark workshop-cut-mark--left" />
            <span className="workshop-cut-mark workshop-cut-mark--right" />
          </div>
        </div>

        <div className="site-shell relative z-10 mx-auto flex min-h-[calc(100svh-4.75rem)] flex-col justify-between px-5 py-10 sm:px-8 sm:py-14 lg:px-10 lg:py-16">
          <div className="max-w-xl">
            <p className="font-display text-xs font-bold uppercase tracking-[0.2em] text-sky">Workshop assembly</p>
            <h2 id="workshop-heading" className="display-heading mt-4 max-w-md text-4xl text-warm sm:text-5xl lg:text-5xl">
              Every part has a purpose.
            </h2>
            <p className="mt-6 max-w-sm text-base leading-7 text-warm/70 sm:text-lg">
              Scroll to bring a working rover together, one system at a time.
            </p>
          </div>

          <div className="max-w-xl">
            <ol className="workshop-stage-readout" aria-label="Rover assembly stages">
              {stages.map((stage, index) => (
                <li key={stage.title} className="workshop-stage-readout__item" data-active={currentStage.index === index} aria-current={currentStage.index === index ? 'step' : undefined}>
                  <span className="workshop-stage-readout__marker" aria-hidden="true" />
                  <span>
                    <span className="workshop-stage-readout__number">{stage.number}</span>
                    <span className="workshop-stage-readout__title">{stage.title}</span>
                  </span>
                </li>
              ))}
            </ol>
            <p className="mt-4 font-display text-sm font-semibold tracking-[0.12em] text-sky" aria-live="polite">{currentStage.isReady ? 'ROVER READY' : currentStage.title}</p>
            <p className="mt-3 text-[0.65rem] uppercase tracking-[0.16em] text-warm/50">Reference model · NASA/JPL-Caltech · no endorsement</p>
          </div>
        </div>
      </div>
    </section>
  )
}
