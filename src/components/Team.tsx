import Image from 'next/image'
import Link from 'next/link'
import { ArrowUpRight, Users } from 'lucide-react'
import { ButtonLink } from '@/components/site/FamilyPrimitives'

type TeamMember = {
  name: string
  position: string
  image: string
}

const teamMembers: TeamMember[] = [
  { name: 'Robin Jeshua Deepak', position: 'Founder & President', image: '/robin.jpg' },
  { name: 'Yashas Jeedi', position: 'Vice President', image: '/yashas.jpg' },
  { name: 'Rahul Eapen', position: 'Vice President', image: '/rahul.jpg' },
  { name: 'Jaden Jirasevijinda', position: 'Vice President', image: '/jaden.jpg' },
  { name: 'Rohan Munagapati', position: 'Vice President', image: '/rohan.jpg' },
  { name: 'Michael Nolan McClung', position: 'Graphics Design Lead', image: '/nolan.jpg' },
  { name: 'Nikhil Madineni', position: 'Member', image: '/nikhil.jpg' },
  { name: 'Arya Rajavelu', position: 'Member', image: '/arya.jpg' },
]

const portraitLayouts = [
  'col-span-7 aspect-[4/5] sm:col-span-5 lg:col-span-5',
  'col-span-5 mt-10 aspect-square sm:col-span-4 sm:mt-14 lg:col-span-3 lg:mt-16',
  'col-span-6 -mt-6 aspect-[5/6] sm:col-span-4 sm:-mt-10 lg:col-span-4 lg:-mt-16',
  'col-span-6 mt-8 aspect-[4/5] sm:col-span-4 sm:mt-12 lg:col-span-3 lg:mt-8',
  'col-span-5 -mt-10 aspect-[3/4] sm:col-span-3 sm:-mt-16 lg:col-span-3 lg:-mt-12',
  'col-span-7 aspect-[4/5] sm:col-span-5 lg:col-span-4',
  'col-span-6 mt-8 aspect-square sm:col-span-4 sm:mt-12 lg:col-span-3 lg:mt-20',
  'col-span-6 -mt-4 aspect-[5/6] sm:col-span-4 sm:-mt-8 lg:col-span-4 lg:-mt-10',
] as const

const teamJoinUrl = 'https://forms.gle/XqeKkMF4cj5W62yL9'

export default function Team() {
  return (
    <div className="bg-[var(--cream)] text-[var(--ink)]">
      <header className="bg-[var(--midnight)] text-[var(--cream)]">
        <div className="mx-auto grid max-w-7xl gap-12 px-5 py-14 sm:px-8 sm:py-20 lg:grid-cols-[0.82fr_1.18fr] lg:items-center lg:gap-16 lg:px-12 lg:py-24">
          <div className="max-w-xl">
            <div className="flex items-center gap-3 font-body text-sm font-semibold text-[var(--sky)]">
              <Users aria-hidden="true" className="h-5 w-5" strokeWidth={1.8} />
              The people behind the work
            </div>
            <h1 className="mt-5 max-w-2xl font-display text-5xl leading-[0.97] tracking-[-0.04em] text-[var(--cream)] sm:text-[4.35rem]">
              Make room for more people to build.
            </h1>
            <p className="mt-7 max-w-lg font-body text-lg font-semibold leading-8 text-[var(--cream)]/90 sm:text-xl">
              Meet the students and team members who make room for technology, questions, and shared momentum.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <ButtonLink href={teamJoinUrl} external variant="glass">
                Join The Team Application
                <ArrowUpRight aria-hidden="true" className="h-4 w-4" />
              </ButtonLink>
              <Link
                href="/volunteer"
                className="inline-flex min-h-11 items-center border border-[var(--cream)]/75 px-5 py-3 font-body text-sm font-bold text-[var(--cream)] transition hover:bg-[var(--cream)] hover:text-[var(--midnight)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sky)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--midnight)]"
              >
                Volunteer
              </Link>
            </div>
          </div>

          <figure className="relative aspect-[5/4] overflow-hidden rounded-[2rem] border border-[var(--cream)]/35 bg-[var(--sky)] sm:aspect-[16/10]">
            <Image
              src="/images/events/family-science-night/IMG_0551.jpg"
              alt="Pillars volunteers and adult partners smiling together outside Family Science Night."
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 58vw"
              className="object-cover transition-transform duration-500 motion-safe:hover:scale-[1.02] motion-reduce:transition-none motion-reduce:hover:scale-100"
            />
            <figcaption className="absolute inset-x-0 bottom-0 border-t border-[var(--cream)]/35 bg-[var(--midnight)]/90 px-4 py-3 text-sm font-semibold text-[var(--cream)]">
              Family Science Night · team moment
            </figcaption>
          </figure>
        </div>
      </header>

      <section className="border-b border-[var(--ink)]/20 bg-[var(--paper)]">
        <div className="mx-auto grid max-w-7xl gap-12 px-5 py-16 sm:px-8 lg:grid-cols-[0.7fr_1.3fr] lg:gap-16 lg:px-12 lg:py-24">
          <div className="max-w-sm">
            <p className="font-body text-sm font-semibold text-[var(--cobalt)]">The current team</p>
            <h2 className="mt-4 font-display text-4xl leading-[1.02] tracking-[-0.03em] text-[var(--midnight)] sm:text-5xl">Names, roles, and faces.</h2>
            <p className="mt-5 font-body text-base leading-7 text-[var(--ink)]/65">
              A living directory for the people who shape the organization today.
            </p>
          </div>

          <ul className="grid grid-cols-12 items-start gap-x-3 gap-y-6 sm:gap-x-4 sm:gap-y-8" aria-label="Pillars of Tech team">
            {teamMembers.map((member, index) => (
              <li key={member.name} className={`group ${portraitLayouts[index]}`}>
                <figure className="relative aspect-[4/5] overflow-hidden rounded-[1.5rem] border border-[var(--ink)]/25 bg-[var(--cream)]">
                  <Image
                    src={member.image}
                    alt={`Portrait of ${member.name}, ${member.position} at Pillars of Tech`}
                    fill
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 18vw"
                    className="object-cover transition-transform duration-500 motion-safe:group-hover:scale-[1.03] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
                    priority={index < 3}
                  />
                  <figcaption className="absolute inset-x-0 bottom-0 border-t border-[var(--cream)]/35 bg-[var(--midnight)]/90 px-3 py-3 text-[var(--cream)]">
                    <span className="block font-display text-lg leading-tight">{member.name}</span>
                    <span className="mt-1 block font-body text-xs font-semibold text-[var(--sky)]">{member.position}</span>
                  </figcaption>
                </figure>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="bg-[var(--midnight)] text-[var(--cream)]">
        <div className="mx-auto flex max-w-7xl flex-col gap-8 px-5 py-14 sm:px-8 lg:flex-row lg:items-end lg:justify-between lg:px-12 lg:py-20">
          <div>
            <p className="font-body text-sm font-semibold text-[var(--sky)]">There is room for you</p>
            <h2 className="mt-4 max-w-2xl font-display text-4xl leading-[1.02] tracking-[-0.03em] sm:text-5xl">Bring your curiosity to the next project.</h2>
          </div>
          <div className="flex flex-wrap gap-3">
            <ButtonLink href={teamJoinUrl} external variant="glass">
              Join The Team Application
              <ArrowUpRight aria-hidden="true" className="h-4 w-4" />
            </ButtonLink>
            <Link
              href="/volunteer"
              className="inline-flex min-h-11 items-center border border-[var(--cream)] px-5 py-3 font-body text-sm font-bold text-[var(--cream)] transition hover:bg-[var(--cream)] hover:text-[var(--midnight)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sky)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--midnight)]"
            >
              Volunteer With Us
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
