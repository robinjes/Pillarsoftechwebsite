'use client'

import Image from 'next/image'
import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion'
import { useRef } from 'react'

type EventProofPhotoProps = {
  src: string
  alt: string
  caption: string
  index: number
  className: string
}

export default function EventProofPhoto({ src, alt, caption, index, className }: EventProofPhotoProps) {
  const frameRef = useRef<HTMLElement>(null)
  const reducedMotion = useReducedMotion() === true
  const { scrollYProgress } = useScroll({
    target: frameRef,
    offset: ['start end', 'end start'],
  })
  const y = useTransform(scrollYProgress, [0, 1], [index % 2 === 0 ? 5 : -4, index % 2 === 0 ? -5 : 4])
  const rotate = useTransform(scrollYProgress, [0, 1], [index % 2 === 0 ? -0.35 : 0.4, index % 2 === 0 ? 0.35 : -0.4])

  return (
    <motion.figure
      ref={frameRef}
      className={`event-proof-photo group ${className}`}
      data-field-photo={index + 1}
      style={{ y: reducedMotion ? 0 : y, rotate: reducedMotion ? 0 : rotate }}
      whileHover={reducedMotion ? undefined : { y: -4 }}
      transition={{ duration: 0.24, ease: 'easeOut' }}
    >
      <div className="event-proof-photo__image relative overflow-hidden border border-ink/20">
        <Image
          src={src}
          alt={alt}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 58vw, 40vw"
          className="object-cover motion-safe:transition motion-safe:duration-500 motion-safe:group-hover:scale-[1.025] motion-reduce:transform-none motion-reduce:transition-none motion-reduce:group-hover:scale-100"
        />
      </div>
      <figcaption>{caption}</figcaption>
    </motion.figure>
  )
}
