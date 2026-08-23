'use client'

import Image from 'next/image'
import { motion, useTransform } from 'framer-motion'

import { useHeroMotionValues } from '@/components/site/HeroMotion'

export default function HeroVisual() {
  const { scrollProgress, reducedMotion } = useHeroMotionValues()
  const mainScale = useTransform(scrollProgress, [0.52, 0.8, 1], [1.02, 1.02, 0.98])
  const mainY = useTransform(scrollProgress, [0.52, 1], [0, -16])
  const overlapY = useTransform(scrollProgress, [0.52, 1], [0, 8])
  const overlapX = useTransform(scrollProgress, [0.52, 1], [0, 4])
  const overlapRotate = useTransform(scrollProgress, [0.52, 1], [0, -1.2])

  return (
    <div className="relative mx-auto max-w-2xl pb-8 pl-0 sm:pb-10 sm:pl-8">
      <figure className="relative aspect-[4/3] w-full overflow-hidden border border-warm/30 bg-sky">
        <motion.div
          className="absolute inset-0 will-change-transform"
          initial={reducedMotion ? false : { clipPath: 'inset(0 100% 0 0)' }}
          animate={reducedMotion ? undefined : { clipPath: 'inset(0 0% 0 0)' }}
          transition={{ duration: 0.8, ease: [0.76, 0, 0.24, 1] }}
          style={{
            scale: reducedMotion ? 1 : mainScale,
            y: reducedMotion ? 0 : mainY,
            clipPath: reducedMotion ? 'inset(0 0% 0 0)' : undefined,
          }}
        >
          <Image
            src="/images/events/science-odyssey/drive-02.webp"
            alt="Students compare and test marshmallow structures at the Science Odyssey engineering table."
            fill
            priority
            sizes="(max-width: 1024px) 100vw, 42vw"
            className="object-cover"
          />
        </motion.div>
        <figcaption className="absolute bottom-0 left-0 border-t border-r border-warm/30 bg-midnight px-3 py-2 text-xs font-semibold text-warm">
          Science Odyssey · Engineering in public
        </figcaption>
      </figure>
      <motion.figure
        className="absolute bottom-0 right-0 hidden aspect-[4/3] w-40 overflow-hidden border-4 border-midnight bg-sky shadow-[6px_6px_0_#A9D8F2] sm:block sm:w-48 lg:w-52"
        style={{
          x: reducedMotion ? 0 : overlapX,
          y: reducedMotion ? 0 : overlapY,
          rotate: reducedMotion ? 0 : overlapRotate,
        }}
      >
        <Image
          src="/images/events/pedrozzi-connect-egg-drop/drive-04.webp"
          alt="Student organizers gather outdoors after the Pedrozzi CONNECT Egg Drop."
          fill
          sizes="208px"
          className="object-cover"
        />
      </motion.figure>
    </div>
  )
}
