import Image from 'next/image'
import Link from 'next/link'

type BrandMarkProps = {
  compact?: boolean
  tone?: 'light' | 'dark'
}

export default function BrandMark({ compact = false, tone = 'dark' }: BrandMarkProps) {
  const isLight = tone === 'light'

  return (
    <Link
      href="/"
      className={`group inline-flex min-h-11 items-center gap-3 transition-colors ${isLight ? 'text-midnight hover:text-cobalt' : 'text-warm hover:text-sky'}`}
      aria-label="Pillars of Tech home"
    >
      <Image
        src="/logonotext.png"
        alt=""
        width={compact ? 34 : 42}
        height={compact ? 34 : 42}
        className={`h-auto w-auto object-contain ${isLight ? 'brightness-0' : ''}`}
        priority
      />
      <span className="font-display text-lg font-semibold tracking-[-0.03em] sm:text-xl">
        Pillars of Tech
      </span>
    </Link>
  )
}
