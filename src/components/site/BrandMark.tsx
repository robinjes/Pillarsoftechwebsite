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
        width={compact ? 300 : 280}
        height={compact ? 54 : 50}
        sizes={compact ? '(max-width: 640px) 220px, 300px' : '(max-width: 640px) 240px, 280px'}
        className={compact ? 'h-[39.286px] w-[220px] object-contain sm:h-[53.571px] sm:w-[300px]' : 'h-auto w-auto object-contain'}
        priority
      />
    </Link>
  )
}
