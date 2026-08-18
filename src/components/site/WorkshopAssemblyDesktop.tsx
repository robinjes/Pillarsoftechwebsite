'use client'

import Image from 'next/image'
import {
  motion,
  type MotionValue,
  useReducedMotion,
  useScroll,
  useTransform,
} from 'framer-motion'
import { useRef } from 'react'

import { desktopVisualLabel, stages } from '@/components/site/workshopAssemblyData'

type PartOrigin = {
  x: number
  y: number
  rotate: number
  scale: number
}

function useAssemblyPart(
  progress: MotionValue<number>,
  origin: PartOrigin,
  destination: PartOrigin,
) {
  return {
    x: useTransform(progress, [0.2, 0.34, 0.78, 0.9], [origin.x, origin.x, destination.x, destination.x]),
    y: useTransform(progress, [0.2, 0.34, 0.78, 0.9], [origin.y, origin.y, destination.y, destination.y]),
    rotate: useTransform(progress, [0.2, 0.34, 0.78, 0.9], [origin.rotate, origin.rotate, destination.rotate, destination.rotate]),
    scale: useTransform(progress, [0.2, 0.34, 0.78, 0.9], [origin.scale, origin.scale, destination.scale, destination.scale]),
    opacity: useTransform(progress, [0.2, 0.27, 0.82, 0.92], [0, 0, 1, 0]),
  }
}

function Part({
  src,
  className,
  style,
  reducedMotion,
}: {
  src: string
  className: string
  style: ReturnType<typeof useAssemblyPart>
  reducedMotion: boolean | null
}) {
  return (
    <div className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 ${className}`} aria-hidden="true">
      <motion.div
        className="relative h-full w-full will-change-transform"
        style={{
          x: style.x,
          y: style.y,
          rotate: style.rotate,
          scale: style.scale,
          opacity: reducedMotion ? 0 : style.opacity,
        }}
      >
        <Image src={src} alt="" fill sizes="22vw" className="object-contain" />
      </motion.div>
    </div>
  )
}

export default function WorkshopAssemblyDesktop() {
  const sectionRef = useRef<HTMLElement>(null)
  const reducedMotion = useReducedMotion()
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start start', 'end end'],
  })

  const lidRotateX = useTransform(scrollYProgress, [0, 0.08, 0.22], [0, 10, 78])
  const lidY = useTransform(scrollYProgress, [0, 0.08, 0.22], [0, -8, -88])
  const lidScale = useTransform(scrollYProgress, [0, 0.22], [1, 0.88])
  const lidOpacity = useTransform(scrollYProgress, [0, 0.15, 0.25], [1, 1, 0])
  const kitOpacity = useTransform(scrollYProgress, [0, 0.08, 0.2, 0.3, 0.48], [0, 0.2, 1, 1, 0])
  const finalOpacity = useTransform(scrollYProgress, [0, 0.78, 0.9, 1], [0, 0, 1, 1])
  const finalScale = useTransform(scrollYProgress, [0.78, 0.94], [0.93, 1])

  const accessOpacity = useTransform(scrollYProgress, [0, 0.22, 0.38], [1, 1, 0.32])
  const buildOpacity = useTransform(scrollYProgress, [0.18, 0.34, 0.7], [0.3, 1, 0.35])
  const leadOpacity = useTransform(scrollYProgress, [0.62, 0.84, 1], [0.25, 1, 1])

  const chassis = useAssemblyPart(
    scrollYProgress,
    { x: 186, y: -116, rotate: 32, scale: 0.42 },
    { x: 0, y: 0, rotate: 0, scale: 1 },
  )
  const electronics = useAssemblyPart(
    scrollYProgress,
    { x: -114, y: 112, rotate: -24, scale: 0.35 },
    { x: 0, y: -4, rotate: 0, scale: 1 },
  )
  const sensor = useAssemblyPart(
    scrollYProgress,
    { x: -192, y: 86, rotate: 20, scale: 0.38 },
    { x: 0, y: 118, rotate: 0, scale: 1 },
  )
  const wheelTopLeft = useAssemblyPart(
    scrollYProgress,
    { x: -154, y: -116, rotate: -42, scale: 0.48 },
    { x: -152, y: -108, rotate: 0, scale: 1 },
  )
  const wheelTopRight = useAssemblyPart(
    scrollYProgress,
    { x: -56, y: -118, rotate: 38, scale: 0.48 },
    { x: 152, y: -108, rotate: 0, scale: 1 },
  )
  const wheelBottomLeft = useAssemblyPart(
    scrollYProgress,
    { x: -154, y: -18, rotate: 54, scale: 0.48 },
    { x: -152, y: 108, rotate: 0, scale: 1 },
  )
  const wheelBottomRight = useAssemblyPart(
    scrollYProgress,
    { x: -56, y: -18, rotate: -34, scale: 0.48 },
    { x: 152, y: 108, rotate: 0, scale: 1 },
  )

  const stageOpacities = [accessOpacity, buildOpacity, leadOpacity]

  return (
    <section ref={sectionRef} className="relative hidden min-h-[280vh] overflow-clip bg-sky lg:block" aria-labelledby="workshop-heading">
      <div className="sticky top-[4.75rem] flex min-h-[calc(100vh-4.75rem)] items-center overflow-hidden">
        <div className="site-shell mx-auto w-full px-10 py-12">
          <div className="editorial-grid items-center gap-y-10">
            <div className="col-span-4">
              <p className="text-sm font-semibold text-cobalt">A workshop, in motion</p>
              <h2 id="workshop-heading" className="display-heading mt-4 max-w-md text-pretty text-5xl text-midnight xl:text-6xl">
                Open it. Build it. Pass it on.
              </h2>
              <p className="body-copy mt-6 max-w-sm text-base text-midnight/70">
                Scroll to turn a box of parts into a project a student can lead.
              </p>

              <div className="mt-10 grid grid-cols-3 border-y border-midnight/25" aria-label="Workshop stages">
                {stages.map((stage, index) => (
                  <motion.div
                    key={stage.number}
                    className="py-4 pr-3 will-change-transform"
                    style={{ opacity: reducedMotion ? (index === 2 ? 1 : 0.45) : stageOpacities[index] }}
                  >
                    <span className="block text-xs font-semibold text-cobalt">{stage.number}</span>
                    <span className="mt-1 block font-display text-lg font-semibold text-midnight">{stage.title}</span>
                  </motion.div>
                ))}
              </div>
            </div>

            <div className="col-span-8 col-start-5 pl-8 xl:pl-14">
              <div
                className="relative mx-auto aspect-square w-full max-w-[42rem] overflow-hidden [perspective:1200px]"
                role="img"
                aria-label={desktopVisualLabel}
              >
                <motion.div
                  className="absolute inset-0"
                  style={{ opacity: reducedMotion ? 0 : kitOpacity }}
                  aria-hidden="true"
                >
                  <Image
                    src="/images/workshop/build.webp"
                    alt=""
                    fill
                    priority
                    sizes="(min-width: 1280px) 42rem, 54vw"
                    className="object-contain"
                  />
                </motion.div>

                <motion.div
                  className="absolute inset-[2%] origin-top will-change-transform"
                  style={{
                    rotateX: reducedMotion ? 78 : lidRotateX,
                    y: reducedMotion ? -88 : lidY,
                    scale: reducedMotion ? 0.88 : lidScale,
                    opacity: reducedMotion ? 0 : lidOpacity,
                    transformOrigin: '50% 12%',
                  }}
                  aria-hidden="true"
                >
                  <Image
                    src="/images/workshop/access.webp"
                    alt=""
                    fill
                    priority
                    sizes="(min-width: 1280px) 42rem, 54vw"
                    className="object-contain"
                  />
                </motion.div>

                <Part src="/images/workshop/chassis-v2.webp" className="h-[46%] w-[46%]" style={chassis} reducedMotion={reducedMotion} />
                <Part src="/images/workshop/electronics-v2.webp" className="h-[27%] w-[27%]" style={electronics} reducedMotion={reducedMotion} />
                <Part src="/images/workshop/sensor-v2.webp" className="h-[18%] w-[18%]" style={sensor} reducedMotion={reducedMotion} />
                <Part src="/images/workshop/wheel-v2.webp" className="h-[18%] w-[18%]" style={wheelTopLeft} reducedMotion={reducedMotion} />
                <Part src="/images/workshop/wheel-v2.webp" className="h-[18%] w-[18%]" style={wheelTopRight} reducedMotion={reducedMotion} />
                <Part src="/images/workshop/wheel-v2.webp" className="h-[18%] w-[18%]" style={wheelBottomLeft} reducedMotion={reducedMotion} />
                <Part src="/images/workshop/wheel-v2.webp" className="h-[18%] w-[18%]" style={wheelBottomRight} reducedMotion={reducedMotion} />

                <motion.div
                  className="absolute inset-0 will-change-transform"
                  style={{
                    opacity: reducedMotion ? 1 : finalOpacity,
                    scale: reducedMotion ? 1 : finalScale,
                  }}
                  aria-hidden="true"
                >
                  <Image
                    src="/images/workshop/lead.webp"
                    alt=""
                    fill
                    sizes="(min-width: 1280px) 42rem, 54vw"
                    className="object-contain"
                  />
                </motion.div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
