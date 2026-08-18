import Image from 'next/image'
import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'

export default function FamilyScienceStory() {
  return (
    <section className="bg-midnight text-warm" aria-labelledby="family-story-heading">
      <div className="site-shell mx-auto px-5 py-20 sm:px-8 lg:px-10 lg:py-28">
        <div className="grid gap-10 lg:grid-cols-12 lg:items-center lg:gap-8">
          <div className="grid grid-cols-5 gap-3 sm:gap-4 lg:col-span-7">
            <figure className="relative col-span-5 aspect-[5/3] overflow-hidden border border-warm/20 sm:col-span-4 sm:aspect-[4/3]">
              <Image
                src="/images/events/family-science-night-altamont/drive-01.webp"
                alt="Students drive VEX robots through a taped floor course at Family Science Night."
                fill
                sizes="(max-width: 1024px) 100vw, 54vw"
                className="object-cover"
              />
            </figure>
            <figure className="relative col-span-3 col-start-3 -mt-10 aspect-[3/4] overflow-hidden border-4 border-midnight bg-sky sm:col-span-2 sm:col-start-4 sm:-mt-16">
              <Image
                src="/images/events/family-science-night-altamont/drive-03.webp"
                alt="An older student helps a child guide a robot through the Family Science Night course."
                fill
                sizes="(max-width: 640px) 42vw, 220px"
                className="object-cover"
              />
            </figure>
          </div>

          <div className="lg:col-span-4 lg:col-start-9">
            <h2 id="family-story-heading" className="display-heading max-w-md text-4xl sm:text-5xl">Curiosity is a team sport.</h2>
            <p className="body-copy mt-5 max-w-md text-base leading-7 text-warm/75">
              At Altamont Creek, families took turns at the controls, tested their ideas, and kept asking what to try next.
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
