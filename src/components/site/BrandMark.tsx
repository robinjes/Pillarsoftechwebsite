import Image from 'next/image'
import Link from 'next/link'

export default function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <Link
      href="/"
      className="inline-flex min-h-11 items-center text-warm transition-opacity hover:opacity-85 focus-ring"
      aria-label="Pillars of Tech home"
    >
      <Image
        src="/images/home/pillars-logo-white.png"
        alt="Pillars of Tech — Breaking Barriers, Building Innovators"
        width={compact ? 264 : 280}
        height={compact ? 47 : 50}
        sizes={compact ? '(max-width: 640px) 210px, 264px' : '(max-width: 640px) 240px, 280px'}
        className={compact ? 'h-[37.5px] w-[210px] object-contain sm:h-[47.143px] sm:w-[264px]' : 'h-auto w-auto object-contain'}
        priority
      />
    </Link>
  )
}
