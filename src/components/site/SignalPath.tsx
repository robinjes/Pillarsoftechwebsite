'use client'

import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion'
import { useRef } from 'react'

const stages = ['QUESTION', 'BUILD', 'TEST', 'SHARE']

export default function SignalPath() {
  const sectionRef = useRef<HTMLElement>(null)
  const reducedMotion = useReducedMotion()
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start 85%', 'end 20%'],
  })
  const pathLength = useTransform(scrollYProgress, [0, 1], [0.08, 1])

  return (
    <section ref={sectionRef} className="signal-path" aria-label="The workshop signal path">
      <div className="signal-path__labels">
        {stages.map((stage, index) => (
          <div key={stage} className="signal-path__label">
            <span className="signal-mono">0{index + 1}</span>
            <strong>{stage}</strong>
          </div>
        ))}
      </div>
      <svg className="signal-path__svg" viewBox="0 0 1000 180" role="img" aria-label="Question to build to test to share">
        <path className="signal-path__track" d="M 40 120 C 185 30, 280 30, 385 120 S 600 210, 710 100 S 875 30, 960 116" />
        <motion.path
          className="signal-path__line"
          d="M 40 120 C 185 30, 280 30, 385 120 S 600 210, 710 100 S 875 30, 960 116"
          style={{ pathLength: reducedMotion ? 1 : pathLength }}
        />
        {[40, 345, 645, 960].map((cx, index) => (
          <circle key={cx} className="signal-path__node" cx={cx} cy={[120, 92, 120, 116][index]} r="7" />
        ))}
      </svg>
      <p className="signal-path__caption signal-mono">A good workshop keeps moving: ask, make, test, then teach someone else.</p>
    </section>
  )
}
