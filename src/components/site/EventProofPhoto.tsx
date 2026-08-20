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
      className={`field-note-photo group relative overflow-visible border border-ink/25 bg-sky ${className}`}
      data-field-photo={index + 1}
      style={{ y: reducedMotion ? 0 : y, rotate: reducedMotion ? 0 : rotate }}
      whileHover={reducedMotion ? undefined : { y: -4 }}
      transition={{ duration: 0.24, ease: 'easeOut' }}
    >
      <div className="relative h-full w-full overflow-hidden">
        <Image
          src={src}
          alt={alt}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 58vw, 40vw"
          className="object-cover motion-safe:transition motion-safe:duration-500 motion-safe:group-hover:scale-[1.025] motion-reduce:transform-none motion-reduce:transition-none motion-reduce:group-hover:scale-100"
        />
      </div>
      <figcaption className="field-note-tape absolute bottom-[-0.7rem] left-3 max-w-[90%] px-3 py-2 text-xs font-semibold text-midnight">
        <span className="mr-2 font-display text-[0.58rem] font-bold uppercase tracking-[0.14em] text-cobalt">Field note {String(index + 1).padStart(2, '0')}</span>
        {caption}
      </figcaption>
    </motion.figure>
  )
}
