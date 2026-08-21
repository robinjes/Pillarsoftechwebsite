'use client'

import Image from 'next/image'
import { motion, useTransform } from 'framer-motion'

import { useHeroMotionValues } from '@/components/site/HeroMotion'

export default function HeroVisual() {
  const { scrollProgress, reducedMotion } = useHeroMotionValues()
  const y = useTransform(scrollProgress, [0, 0.55, 1], [12, 0, -10])
  const rotate = useTransform(scrollProgress, [0, 0.55, 1], [-0.5, 0, 0.35])
  const scale = useTransform(scrollProgress, [0, 0.55, 1], [1.01, 1.03, 0.99])

  return (
    <div className="hero-visual relative mx-auto max-w-2xl" data-hero-visual>
      <div className="hero-visual__backdrop absolute -bottom-5 -left-4 h-[72%] w-[72%] bg-sky sm:-bottom-7 sm:-left-6" aria-hidden="true" />
      <motion.figure
        className="hero-visual__frame relative aspect-[5/4] overflow-hidden border border-midnight/20 bg-midnight sm:aspect-[4/5]"
        style={{
          y: reducedMotion ? 0 : y,
          rotate: reducedMotion ? 0 : rotate,
          scale: reducedMotion ? 1 : scale,
        }}
      >
        <Image
          src="/images/events/science-odyssey/drive-02.webp"
          alt="Students compare and test marshmallow structures at the Science Odyssey engineering table."
          fill
          priority
          sizes="(max-width: 1024px) 100vw, 44vw"
          className="object-cover"
        />
        <figcaption className="hero-visual__caption absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 border-t border-warm/25 bg-midnight/90 px-4 py-3 text-sm text-warm sm:px-5 sm:py-4">
          <span className="font-semibold">Science Odyssey</span>
          <span className="text-right text-warm/65">Build and test</span>
        </figcaption>
      </motion.figure>
      <p className="mt-4 max-w-md text-sm leading-6 text-ink/60 sm:ml-auto sm:max-w-xs sm:text-right">
        A room full of small experiments, patient mentors, and students testing what they can make.
      </p>
    </div>
  )
}
