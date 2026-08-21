import Image from 'next/image'
import Link from 'next/link'

export default function BrandMark({ compact = false, tone = 'light' }: { compact?: boolean; tone?: 'light' | 'dark' }) {
  return (
    <Link
      href="/"
      className={`brand-mark inline-flex min-h-11 items-center gap-3 transition-colors ${tone === 'dark' ? 'text-ink hover:text-cobalt' : 'text-warm hover:text-sky'}`}
      aria-label="Pillars of Tech home"
    >
      <Image
        src="/logonotext.png"
        alt=""
        width={compact ? 34 : 42}
        height={compact ? 34 : 42}
        className={`h-auto w-auto object-contain ${tone === 'dark' ? 'brand-mark__image--dark' : ''}`}
        priority
      />
      <span className="font-display text-lg font-semibold tracking-[-0.03em] sm:text-xl">
        Pillars of Tech
      </span>
    </Link>
  )
}
