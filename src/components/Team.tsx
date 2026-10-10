import Image from 'next/image'
import Link from 'next/link'
import HolographicEventCard from '@/components/HolographicEventCard'
import { ArrowUpRight, Users } from 'lucide-react'
import { ButtonLink } from '@/components/site/FamilyPrimitives'

type TeamMember = {
  name: string
  position: string
  image: string
  portraitClassName?: string
  portraitPosition?: string
}

const teamMembers: TeamMember[] = [
  { name: 'Robin Jeshua Deepak', position: 'Founder & President', image: '/robin.jpg', portraitClassName: 'scale-[2] origin-[left_65%]' },
  { name: 'Yashas Jeedi', position: 'Vice President', image: '/yashas.jpg' },
  { name: 'Rahul Eapen', position: 'Vice President', image: '/rahul.jpg' },
  { name: 'Jaden Jirasevijinda', position: 'Vice President', image: '/images/team/jaden.jpg', portraitPosition: 'center 50%' },
  { name: 'Rohan Munagapati', position: 'Vice President', image: '/rohan.jpg', portraitClassName: 'scale-[1.6] origin-[center_75%]' },
  { name: 'Michael Nolan McClung', position: 'Graphics Design Lead', image: '/nolan.jpg' },
  { name: 'Nikhil Madineni', position: 'Member', image: '/nikhil.jpg' },
  { name: 'Arya Rajavelu', position: 'Member', image: '/arya.jpg' },
]

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
                className="inline-flex min-h-11 items-center rounded-full border-2 border-[var(--cream)]/75 px-5 py-3 font-body text-sm font-bold text-[var(--cream)] transition hover:bg-[var(--cream)] hover:text-[var(--midnight)] focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-[var(--sky)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--midnight)]"
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
          </figure>
        </div>
      </header>

      <section className="border-b border-[var(--ink)]/20 bg-[var(--paper)]">
        <div className="mx-auto max-w-7xl px-5 py-16 sm:px-8 lg:px-12 lg:py-24">
          <div className="mb-10 max-w-2xl sm:mb-12">
            <p className="font-body text-sm font-semibold text-[var(--cobalt)]">The current team</p>
            <h2 className="mt-4 font-display text-4xl leading-[1.02] tracking-[-0.03em] text-[var(--midnight)] sm:text-5xl">Meet our team.</h2>
            <p className="mt-5 font-body text-base leading-7 text-[var(--ink)]/65">
              The people who make our programs possible.
            </p>
          </div>

          <ul className="grid grid-cols-2 gap-x-4 gap-y-8 sm:gap-x-6 sm:gap-y-10 lg:grid-cols-4" aria-label="Pillars of Tech team">
            {teamMembers.map((member) => (
              <li key={member.name} className="min-w-0">
                <HolographicEventCard id={member.name} kind="team">
                  <div className="relative aspect-[4/5] w-full overflow-hidden bg-[var(--cream)]">
                    <Image
                      src={member.image}
                      alt={`Portrait of ${member.name}, ${member.position} at Pillars of Tech`}
                      fill
                      sizes={member.portraitClassName ? '(max-width: 1024px) 100vw, 50vw' : '(max-width: 1024px) 50vw, 25vw'}
                      className={`object-cover ${member.portraitClassName || ''}`}
                      style={{ objectPosition: member.portraitPosition || 'center 25%' }}
                    />
                  </div>
                  <div className="flex flex-1 flex-col px-3 py-4 sm:px-4 sm:py-5">
                    <h3 className="min-h-12 break-words font-display text-base leading-6 text-[var(--midnight)] sm:text-lg">{member.name}</h3>
                    <p className="mt-1 font-body text-xs font-semibold leading-5 text-[var(--cobalt)] sm:text-sm">{member.position}</p>
                  </div>
                </HolographicEventCard>
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
              className="inline-flex min-h-11 items-center rounded-full border-2 border-[var(--cream)] px-5 py-3 font-body text-sm font-bold text-[var(--cream)] transition hover:bg-[var(--cream)] hover:text-[var(--midnight)] focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-[var(--sky)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--midnight)]"
            >
              Volunteer With Us
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
