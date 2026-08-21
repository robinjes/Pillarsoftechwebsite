import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'
import CloudinaryPhotoGallery from '@/components/CloudinaryPhotoGallery'
import { photoGalleries } from '@/data/photo-galleries'

const gallery = photoGalleries.wildcatTank

export const metadata: Metadata = {
  title: 'Wildcat Tank Photos | Pillars of Tech',
  description:
    'Browse selected repository photographs from Wildcat Tank 2026 in an accessible responsive gallery.',
}

export default function WildcatTankPhotosPage() {
  return (
    <div className="bg-[var(--bone)] text-[var(--carbon)]">
      <section className="border-b border-[var(--carbon)]/30 bg-[var(--off-white)] py-12 sm:py-16" aria-labelledby="photo-context-heading">
        <div className="signal-shell grid gap-8 sm:grid-cols-[1fr_0.8fr] sm:items-end">
          <div>
            <p className="signal-mono signal-eyebrow">WILDCAT TANK / FIELD FRAMES</p>
            <h1 id="photo-context-heading" className="mt-3 max-w-2xl font-display text-4xl leading-[0.98] tracking-[-0.045em] sm:text-5xl">See the room after the idea lands.</h1>
            <p className="mt-4 max-w-xl text-base leading-7 text-[var(--carbon)]/70">A small visual record from the competition day. Open a frame to inspect it, or return to the event report for the score and presentation trail.</p>
            <Link href="/wildcat-tank" className="signal-button signal-button--line mt-6">Back to the scoreboard <ArrowUpRight aria-hidden="true" /></Link>
          </div>
          <figure className="relative aspect-[5/3] overflow-hidden border border-[var(--carbon)] shadow-[0.55rem_0.55rem_0_var(--signal-orange)]">
            <Image src="/images/events/wildcat-tank/Outdoor2.JPG" alt="Students test marshmallow structures with volunteers during Wildcat Tank." fill sizes="(max-width: 640px) 100vw, 40vw" className="object-cover" priority />
            <figcaption className="absolute inset-x-0 bottom-0 bg-[var(--carbon)]/88 px-3 py-2 signal-mono text-[var(--off-white)]">FRAME 02 / TEST</figcaption>
          </figure>
        </div>
      </section>
      <CloudinaryPhotoGallery
        title={gallery.title}
        description={gallery.description}
        folder={gallery.folder}
        photos={gallery.photos}
      />
    </div>
  )
}
