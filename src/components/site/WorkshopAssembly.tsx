'use client'

import Image from 'next/image'
import { motion, type MotionValue, useReducedMotion, useScroll, useTransform } from 'framer-motion'
import { useRef } from 'react'

type AssemblyState = 1 | 2 | 3

const stages: Array<{ number: string; title: string; text: string }> = [
  { number: '01', title: 'Access', text: 'Start with a question, a table, and room to try.' },
  { number: '02', title: 'Build', text: 'Turn the idea into something you can test and tune.' },
  { number: '03', title: 'Lead', text: 'Carry the confidence into the next challenge.' },
]

const visualStates: Array<{ state: AssemblyState; src: string; alt: string }> = [
  {
    state: 1,
    src: '/images/workshop/access.webp',
    alt: 'A closed workshop kit ready to open for a STEM project.',
  },
  {
    state: 2,
    src: '/images/workshop/build.webp',
    alt: 'An open STEM kit with wheels, sensors, wiring, and rover parts ready to assemble.',
  },
  {
    state: 3,
    src: '/images/workshop/lead.webp',
    alt: 'A completed rover with its components assembled and ready to test.',
  },
]

const desktopVisualLabel = 'A rover project moves from a closed kit to organized components and a completed build through Access, Build, and Lead.'

function desktopVisualStyle(
  opacity: MotionValue<number>,
  y: MotionValue<number>,
  scale: MotionValue<number>,
  reducedMotion: boolean | null,
  reducedOpacity: number,
) {
  return {
    opacity: reducedMotion ? reducedOpacity : opacity,
    scale: reducedMotion ? 1 : scale,
    y: reducedMotion ? 0 : y,
  }
}

export default function WorkshopAssembly() {
  const sectionRef = useRef<HTMLElement>(null)
  const reducedMotion = useReducedMotion()
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start start', 'end end'],
  })
  const accessOpacity = useTransform(scrollYProgress, [0, 0.2, 0.42], [1, 0.9, 0])
  const buildOpacity = useTransform(scrollYProgress, [0.16, 0.36, 0.64, 0.8], [0, 1, 1, 0.12])
  const leadOpacity = useTransform(scrollYProgress, [0.56, 0.78, 1], [0, 0.92, 1])
  const accessY = useTransform(scrollYProgress, [0, 0.42], [12, 0])
  const buildY = useTransform(scrollYProgress, [0.16, 0.64], [18, 0])
  const leadY = useTransform(scrollYProgress, [0.56, 1], [20, 0])
  const accessScale = useTransform(scrollYProgress, [0, 0.42], [0.98, 1])
  const buildScale = useTransform(scrollYProgress, [0.16, 0.64], [0.98, 1])
  const leadScale = useTransform(scrollYProgress, [0.56, 1], [0.98, 1])

  const visualStyles = [
    desktopVisualStyle(accessOpacity, accessY, accessScale, reducedMotion, 0),
    desktopVisualStyle(buildOpacity, buildY, buildScale, reducedMotion, 0),
    desktopVisualStyle(leadOpacity, leadY, leadScale, reducedMotion, 1),
  ]

  return (
    <>
      <section ref={sectionRef} className="relative hidden min-h-[180vh] bg-sky lg:block" aria-labelledby="workshop-heading">
        <div className="sticky top-[4.75rem] flex min-h-[calc(100vh-4.75rem)] items-center">
          <div className="site-shell mx-auto w-full px-5 py-16 sm:px-8 lg:px-10">
            <div className="editorial-grid items-center gap-y-12">
              <div className="col-span-5">
                <p className="mb-4 font-display text-sm font-bold uppercase tracking-[0.2em] text-midnight">Workshop Assembly</p>
                <h2 id="workshop-heading" className="display-heading max-w-lg text-5xl text-midnight xl:text-7xl">Access → Build → Lead.</h2>
                <p className="body-copy mt-7 text-lg text-midnight/75">A small idea becomes a real thing through a sequence of generous invitations.</p>
                <ol className="mt-12 border-t border-midnight/30">
                  {stages.map((stage) => (
                    <li key={stage.number} className="grid grid-cols-[3.5rem_1fr] gap-4 border-b border-midnight/30 py-5">
                      <span className="font-display text-sm font-bold text-midnight">{stage.number}</span>
                      <span>
                        <strong className="block font-display text-xl text-midnight">{stage.title}</strong>
                        <span className="mt-1 block text-sm leading-6 text-midnight/70">{stage.text}</span>
                      </span>
                    </li>
                  ))}
                </ol>
                <div className="mt-8 h-1 w-full origin-left bg-midnight/15">
                  <motion.div className="h-full origin-left bg-cobalt" style={{ scaleX: reducedMotion ? 1 : scrollYProgress }} />
                </div>
              </div>

              <div className="col-span-7 border-l border-midnight/20 pl-8 xl:pl-16">
                <div className="mx-auto max-w-2xl">
                  <div className="relative aspect-[640/460] w-full" role="img" aria-label={desktopVisualLabel}>
                    {visualStates.map((visual, index) => (
                      <motion.div
                        key={visual.state}
                        className="absolute inset-0"
                        style={visualStyles[index]}
                        aria-hidden="true"
                      >
                        <Image
                          src={visual.src}
                          alt=""
                          fill
                          sizes="(min-width: 1280px) 42vw, 50vw"
                          priority={index === 0}
                          className="object-contain"
                        />
                      </motion.div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-sky lg:hidden" aria-labelledby="workshop-mobile-heading">
        <div className="site-shell mx-auto px-5 py-20 sm:px-8">
          <p className="mb-4 font-display text-sm font-bold uppercase tracking-[0.2em] text-midnight">Workshop Assembly</p>
          <h2 id="workshop-mobile-heading" className="display-heading text-4xl text-midnight sm:text-5xl">Access → Build → Lead.</h2>
          <div className="mt-10 grid gap-10">
            {stages.map((stage, index) => {
              const visual = visualStates[index]
              return (
                <article key={stage.number} className="border-t border-midnight/30 pt-5">
                  <div className="flex items-baseline justify-between gap-5">
                    <h3 className="font-display text-2xl font-semibold text-midnight">{stage.title}</h3>
                    <span className="font-display text-sm font-bold text-midnight">{stage.number}</span>
                  </div>
                  <div className="relative mt-6 aspect-[640/460] border border-midnight/30 p-3">
                    <Image
                      src={visual.src}
                      alt={visual.alt}
                      fill
                      sizes="(max-width: 640px) calc(100vw - 3rem), 40rem"
                      className="object-contain p-3"
                    />
                  </div>
                  <p className="mt-5 text-base leading-7 text-midnight/75">{stage.text}</p>
                </article>
              )
            })}
          </div>
        </div>
      </section>
    </>
  )
}
