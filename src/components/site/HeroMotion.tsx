'use client'

import {
  createContext,
  useContext,
  useRef,
  type PropsWithChildren,
} from 'react'
import {
  motion,
  type MotionValue,
  useReducedMotion,
  useScroll,
  useTransform,
} from 'framer-motion'

type HeroMotionContextValue = {
  scrollProgress: MotionValue<number>
  reducedMotion: boolean
}

const HeroMotionContext = createContext<HeroMotionContextValue | null>(null)

function useHeroMotion() {
  const value = useContext(HeroMotionContext)

  if (!value) {
    throw new Error('Hero motion elements must be rendered inside HeroMotionScene.')
  }

  return value
}

export function HeroMotionScene({ children }: PropsWithChildren) {
  const sceneRef = useRef<HTMLDivElement>(null)
  const reducedMotion = useReducedMotion()
  const { scrollYProgress } = useScroll({
    target: sceneRef,
    offset: ['start end', 'end start'],
  })

  return (
    <div ref={sceneRef} className="relative">
      <HeroMotionContext.Provider value={{ scrollProgress: scrollYProgress, reducedMotion: reducedMotion === true }}>
        {children}
      </HeroMotionContext.Provider>
    </div>
  )
}

export default HeroMotionScene

export function HeroMotionText({ children, className }: PropsWithChildren<{ className?: string }>) {
  const { scrollProgress, reducedMotion } = useHeroMotion()
  const y = useTransform(scrollProgress, [0.52, 0.8, 1], [0, 0, -10])
  const opacity = useTransform(scrollProgress, [0.52, 0.8, 1], [1, 1, 0.82])

  return (
    <motion.div
      className={className}
      style={{
        y: reducedMotion ? 0 : y,
        opacity: reducedMotion ? 1 : opacity,
      }}
    >
      {children}
    </motion.div>
  )
}

export function useHeroMotionValues() {
  return useHeroMotion()
}
