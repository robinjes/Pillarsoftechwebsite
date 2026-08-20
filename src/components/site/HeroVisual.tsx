'use client'

import Image from 'next/image'
import { motion, useTransform } from 'framer-motion'

import { useHeroMotionValues } from '@/components/site/HeroMotion'

export default function HeroVisual() {
  const { scrollProgress, reducedMotion } = useHeroMotionValues()
  const mainY = useTransform(scrollProgress, [0, 0.55, 1], [8, 0, -10])
  const mainRotate = useTransform(scrollProgress, [0, 0.55, 1], [-0.4, 0, 0.5])
  const mainScale = useTransform(scrollProgress, [0, 0.55, 1], [1.01, 1.03, 0.98])
  const sideY = useTransform(scrollProgress, [0, 0.55, 1], [-6, 0, 8])
  const sideRotate = useTransform(scrollProgress, [0, 0.55, 1], [1.4, 0.8, -0.4])
  const detailY = useTransform(scrollProgress, [0, 0.55, 1], [5, 0, -5])
  const detailRotate = useTransform(scrollProgress, [0, 0.55, 1], [-1, -0.5, 0.8])

  return (
    <div className="hero-workshop-stage relative mx-auto max-w-2xl pb-8 pl-0 sm:pb-10 sm:pl-8" data-hero-contact-sheet>
      <div className="relative border border-warm/35 bg-sky p-2 sm:p-3">
        <motion.span
          className="hero-print-shutter hero-print-shutter--top"
          aria-hidden="true"
          initial={reducedMotion ? false : { x: -5, opacity: 0.72 }}
          animate={reducedMotion ? undefined : { x: 0, opacity: 1 }}
          transition={{ duration: 0.58, ease: 'easeOut' }}
        />
        <motion.span
          className="hero-print-shutter hero-print-shutter--bottom"
          aria-hidden="true"
          initial={reducedMotion ? false : { x: 4, opacity: 0.72 }}
          animate={reducedMotion ? undefined : { x: 0, opacity: 1 }}
          transition={{ duration: 0.62, ease: 'easeOut', delay: 0.06 }}
        />

        <div className="relative grid min-h-[22rem] grid-cols-5 grid-rows-[1.15fr_.85fr] gap-2 sm:min-h-[28rem] sm:gap-3">
          <motion.figure
            className="relative col-span-3 row-span-2 overflow-hidden border border-midnight/35 bg-midnight"
            style={{ y: reducedMotion ? 0 : mainY, rotate: reducedMotion ? 0 : mainRotate, scale: reducedMotion ? 1 : mainScale }}
          >
            <Image
              src="/images/events/science-odyssey/drive-02.webp"
              alt="Students compare and test marshmallow structures at the Science Odyssey engineering table."
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 30vw"
              className="object-cover"
            />
            <figcaption className="field-note-tape absolute bottom-3 left-3 max-w-[85%] px-2 py-1 text-[0.62rem] font-bold uppercase tracking-[0.12em] text-midnight">
              ENGINEERING TABLE · TEST
            </figcaption>
          </motion.figure>

          <motion.figure
            className="relative col-span-2 row-span-1 overflow-hidden border border-midnight/35 bg-midnight"
            style={{ y: reducedMotion ? 0 : sideY, rotate: reducedMotion ? 0 : sideRotate }}
          >
            <Image
              src="/images/events/family-science-night-altamont/drive-04.webp"
              alt="An older student shows a child how to control a VEX robot at Family Science Night."
              fill
              sizes="(max-width: 1024px) 42vw, 20vw"
              className="object-cover"
            />
            <figcaption className="field-note-tape absolute bottom-2 right-2 px-2 py-1 text-[0.58rem] font-bold uppercase tracking-[0.1em] text-midnight">
              TRY TOGETHER
            </figcaption>
          </motion.figure>

          <motion.figure
            className="relative col-span-2 row-span-1 overflow-hidden border border-midnight/35 bg-midnight"
            style={{ y: reducedMotion ? 0 : detailY, rotate: reducedMotion ? 0 : detailRotate }}
          >
            <Image
              src="/images/events/pedrozzi-connect-egg-drop/drive-04.webp"
              alt="Student organizers gather outdoors after the Pedrozzi CONNECT Egg Drop."
              fill
              sizes="(max-width: 1024px) 42vw, 20vw"
              className="object-cover"
            />
            <figcaption className="field-note-tape absolute bottom-2 left-2 px-2 py-1 text-[0.58rem] font-bold uppercase tracking-[0.1em] text-midnight">
              SHARE THE RESULT
            </figcaption>
          </motion.figure>
        </div>

        <motion.div
          className="hero-registration-mark hero-registration-mark--top-left"
          aria-hidden="true"
          initial={reducedMotion ? false : { opacity: 0.55, scale: 0.94 }}
          animate={reducedMotion ? undefined : { opacity: 0.72, scale: 1 }}
          transition={{ duration: 0.48, ease: 'easeOut' }}
        />
        <motion.div
          className="hero-registration-mark hero-registration-mark--top-right"
          aria-hidden="true"
          initial={reducedMotion ? false : { opacity: 0.55, scale: 1.06 }}
          animate={reducedMotion ? undefined : { opacity: 0.72, scale: 1 }}
          transition={{ duration: 0.52, ease: 'easeOut', delay: 0.04 }}
        />
        <motion.div
          className="hero-registration-mark hero-registration-mark--bottom-left"
          aria-hidden="true"
          initial={reducedMotion ? false : { opacity: 0.55 }}
          animate={reducedMotion ? undefined : { opacity: 0.72 }}
          transition={{ duration: 0.56, ease: 'easeOut', delay: 0.08 }}
        />
        <motion.div
          className="hero-registration-mark hero-registration-mark--bottom-right"
          aria-hidden="true"
          initial={reducedMotion ? false : { opacity: 0.55 }}
          animate={reducedMotion ? undefined : { opacity: 0.72 }}
          transition={{ duration: 0.6, ease: 'easeOut', delay: 0.12 }}
        />
        <motion.span
          className="hero-cut-mark hero-cut-mark--left"
          aria-hidden="true"
          initial={reducedMotion ? false : { opacity: 0.48 }}
          animate={reducedMotion ? undefined : { opacity: 0.7 }}
          transition={{ duration: 0.48, ease: 'easeOut', delay: 0.05 }}
        />
        <motion.span
          className="hero-cut-mark hero-cut-mark--right"
          aria-hidden="true"
          initial={reducedMotion ? false : { opacity: 0.48 }}
          animate={reducedMotion ? undefined : { opacity: 0.7 }}
          transition={{ duration: 0.52, ease: 'easeOut', delay: 0.1 }}
        />
        <p className="absolute bottom-1 left-3 font-display text-[0.58rem] font-bold uppercase tracking-[0.2em] text-midnight/70 sm:left-4">
          PILLARS FIELD KIT / CONTACT SHEET 01
        </p>
      </div>

    </div>
  )
}
