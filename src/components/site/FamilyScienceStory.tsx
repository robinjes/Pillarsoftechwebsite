import Image from 'next/image'
import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'

export default function FamilyScienceStory() {
  return (
    <section className="bg-midnight text-warm" aria-labelledby="family-story-heading">
      <div className="site-shell mx-auto px-5 py-20 sm:px-8 lg:px-10 lg:py-28">
        <div className="editorial-grid items-center gap-y-10">
          <div className="relative col-span-12 aspect-[4/3] overflow-hidden border border-white/20 lg:col-span-7">
            <Image
              src="/images/events/family-science-night/IMG_5880.jpg"
              alt="A child operates a VEX robot at Family Science Night"
              fill
              sizes="(max-width: 1024px) 100vw, 58vw"
              className="object-cover"
            />
          </div>
          <div className="col-span-12 lg:col-span-4 lg:col-start-9">
            <p className="mb-4 font-display text-sm font-bold uppercase tracking-[0.2em] text-sky">A family science night</p>
            <h2 id="family-story-heading" className="display-heading text-4xl sm:text-5xl">Curiosity is a team sport.</h2>
            <p className="body-copy mt-6 text-base leading-7 text-warm/80">
              At Altamont Creek, families moved from table to table testing ideas, driving robots, and asking the next question. The best part was not a single answer—it was having the space to figure something out together.
            </p>
            <Link href="/events/family-science-night-altamont" className="mt-7 inline-flex min-h-11 items-center border-b-2 border-sky px-1 text-sm font-bold text-sky hover:border-warm hover:text-warm">
              Read the event story <ArrowUpRight className="ml-2 h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
