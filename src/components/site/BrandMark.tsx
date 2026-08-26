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
        width={compact ? 205 : 260}
        height={compact ? 37 : 46}
        sizes={compact ? '(max-width: 640px) 180px, 205px' : '(max-width: 640px) 210px, 260px'}
        className="h-auto w-auto object-contain"
        priority
      />
    </Link>
  )
}
