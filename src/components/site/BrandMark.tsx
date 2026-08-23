import Image from 'next/image'
import Link from 'next/link'

export default function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <Link
      href="/"
      className="inline-flex min-h-11 items-center gap-3 text-warm transition-colors hover:text-sky"
      aria-label="Pillars of Tech home"
    >
      <Image
        src="/logonotext.png"
        alt=""
        width={compact ? 34 : 42}
        height={compact ? 34 : 42}
        className="h-auto w-auto object-contain"
        priority
      />
      <span className="font-display text-lg font-semibold tracking-[-0.03em] sm:text-xl">
        Pillars of Tech
      </span>
    </Link>
  )
}
