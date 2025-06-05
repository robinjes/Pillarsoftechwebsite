'use client'

import Image from 'next/image'
import { motion } from 'framer-motion'

export default function Banner() {
  return (
    <div className="w-full bg-[#1C1C1C] relative h-48">
      <Image
        src="/PillarsOfTechLogo.png"
        alt="Pillars of Tech Logo"
        fill
        className="object-contain"
        priority
        sizes="100vw"
      />
    </div>
  )
} 