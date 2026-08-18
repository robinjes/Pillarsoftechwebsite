'use client'

import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion'
import { useRef } from 'react'

type AssemblyState = 1 | 2 | 3

const stages = [
  { number: '01', title: 'Access', text: 'Start with a question, a table, and room to try.' },
  { number: '02', title: 'Build', text: 'Turn the idea into something you can test and tune.' },
  { number: '03', title: 'Lead', text: 'Carry the confidence into the next challenge.' },
]

function RoverSvg({ state }: { state: AssemblyState }) {
  return (
    <svg viewBox="0 0 640 460" role="img" aria-label={`Rover assembly state ${state}`} className="h-auto w-full">
      <rect x="28" y="24" width="584" height="412" fill="#F3EBDD" stroke="#101114" strokeWidth="2" />
      <path d="M52 78H588M52 382H588M92 44V416M548 44V416" stroke="#2B5DA8" strokeOpacity=".28" strokeWidth="1" />
      <g fill="none" stroke="#101114" strokeWidth="2">
        <circle cx="118" cy="112" r="5" fill="#A9D8F2" />
        <circle cx="522" cy="112" r="5" fill="#A9D8F2" />
        <circle cx="118" cy="348" r="5" fill="#A9D8F2" />
        <circle cx="522" cy="348" r="5" fill="#A9D8F2" />
      </g>
      <g opacity={state >= 1 ? 1 : 0.3}>
        <rect x="184" y="138" width="272" height="184" rx="10" fill="#0B1F3A" stroke="#101114" strokeWidth="3" />
        <rect x="212" y="166" width="216" height="128" rx="6" fill="#2B5DA8" stroke="#A9D8F2" strokeWidth="2" />
        <rect x="242" y="192" width="156" height="76" rx="4" fill="#0B1F3A" stroke="#A9D8F2" strokeWidth="2" />
        <circle cx="320" cy="230" r="18" fill="#A9D8F2" stroke="#101114" strokeWidth="2" />
        <path d="M310 230h20M320 220v20" stroke="#0B1F3A" strokeWidth="3" />
      </g>
      <g opacity={state >= 2 ? 1 : 0.16}>
        <rect x="146" y="176" width="34" height="108" rx="4" fill="#A9D8F2" stroke="#101114" strokeWidth="2" />
        <rect x="460" y="176" width="34" height="108" rx="4" fill="#A9D8F2" stroke="#101114" strokeWidth="2" />
        <circle cx="163" cy="158" r="18" fill="#2B5DA8" stroke="#101114" strokeWidth="2" />
        <circle cx="477" cy="158" r="18" fill="#2B5DA8" stroke="#101114" strokeWidth="2" />
        <path d="M163 140v-32M477 140v-32M163 108h44M477 108h-44" stroke="#101114" strokeWidth="4" />
      </g>
      <g opacity={state >= 3 ? 1 : 0.16}>
        <circle cx="216" cy="338" r="34" fill="#101114" stroke="#A9D8F2" strokeWidth="5" />
        <circle cx="424" cy="338" r="34" fill="#101114" stroke="#A9D8F2" strokeWidth="5" />
        <circle cx="216" cy="338" r="12" fill="#A9D8F2" />
        <circle cx="424" cy="338" r="12" fill="#A9D8F2" />
      </g>
    </svg>
  )
}

export default function WorkshopAssembly() {
  const sectionRef = useRef<HTMLElement>(null)
  const reducedMotion = useReducedMotion()
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start start', 'end end'],
  })
  const chassisY = useTransform(scrollYProgress, [0, 0.4], [36, 0])
  const chassisOpacity = useTransform(scrollYProgress, [0, 0.24, 0.42], [0.3, 0.75, 1])
  const partsY = useTransform(scrollYProgress, [0.18, 0.68], [-64, 0])
  const partsOpacity = useTransform(scrollYProgress, [0.18, 0.42, 0.7], [0.05, 0.6, 1])
  const wheelsY = useTransform(scrollYProgress, [0.5, 0.98], [80, 0])
  const wheelsOpacity = useTransform(scrollYProgress, [0.5, 0.85], [0.08, 1])

  const motionValue = (value: typeof chassisY) => (reducedMotion ? 0 : value)
  const opacityValue = (value: typeof chassisOpacity) => (reducedMotion ? 1 : value)

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
                      <span className="font-display text-sm font-bold text-cobalt">{stage.number}</span>
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
                  <svg viewBox="0 0 640 460" role="img" aria-label="Top-down rover assembling from parts" className="h-auto w-full">
                    <rect x="28" y="24" width="584" height="412" fill="#F3EBDD" stroke="#101114" strokeWidth="2" />
                    <path d="M52 78H588M52 382H588M92 44V416M548 44V416" stroke="#2B5DA8" strokeOpacity=".28" strokeWidth="1" />
                    <motion.g style={{ y: motionValue(chassisY), opacity: opacityValue(chassisOpacity) }}>
                      <rect x="184" y="138" width="272" height="184" rx="10" fill="#0B1F3A" stroke="#101114" strokeWidth="3" />
                      <rect x="212" y="166" width="216" height="128" rx="6" fill="#2B5DA8" stroke="#A9D8F2" strokeWidth="2" />
                      <rect x="242" y="192" width="156" height="76" rx="4" fill="#0B1F3A" stroke="#A9D8F2" strokeWidth="2" />
                      <circle cx="320" cy="230" r="18" fill="#A9D8F2" stroke="#101114" strokeWidth="2" />
                      <path d="M310 230h20M320 220v20" stroke="#0B1F3A" strokeWidth="3" />
                    </motion.g>
                    <motion.g style={{ y: motionValue(partsY), opacity: opacityValue(partsOpacity) }}>
                      <rect x="146" y="176" width="34" height="108" rx="4" fill="#A9D8F2" stroke="#101114" strokeWidth="2" />
                      <rect x="460" y="176" width="34" height="108" rx="4" fill="#A9D8F2" stroke="#101114" strokeWidth="2" />
                      <circle cx="163" cy="158" r="18" fill="#2B5DA8" stroke="#101114" strokeWidth="2" />
                      <circle cx="477" cy="158" r="18" fill="#2B5DA8" stroke="#101114" strokeWidth="2" />
                      <path d="M163 140v-32M477 140v-32M163 108h44M477 108h-44" stroke="#101114" strokeWidth="4" />
                    </motion.g>
                    <motion.g style={{ y: motionValue(wheelsY), opacity: opacityValue(wheelsOpacity) }}>
                      <circle cx="216" cy="338" r="34" fill="#101114" stroke="#A9D8F2" strokeWidth="5" />
                      <circle cx="424" cy="338" r="34" fill="#101114" stroke="#A9D8F2" strokeWidth="5" />
                      <circle cx="216" cy="338" r="12" fill="#A9D8F2" />
                      <circle cx="424" cy="338" r="12" fill="#A9D8F2" />
                    </motion.g>
                  </svg>
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
            {stages.map((stage) => (
              <article key={stage.number} className="border-t border-midnight/30 pt-5">
                <div className="flex items-baseline justify-between gap-5">
                  <h3 className="font-display text-2xl font-semibold text-midnight">{stage.title}</h3>
                  <span className="font-display text-sm font-bold text-cobalt">{stage.number}</span>
                </div>
                <div className="mt-6 border border-midnight/30 p-3">
                  <RoverSvg state={Number(stage.number) as AssemblyState} />
                </div>
                <p className="mt-5 text-base leading-7 text-midnight/75">{stage.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
    </>
  )
}
