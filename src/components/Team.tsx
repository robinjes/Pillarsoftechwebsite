import Image from 'next/image'
import Link from 'next/link'
import { ArrowUpRight, Users } from 'lucide-react'

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

const teamJoinUrl = 'https://forms.gle/XqeKkMF4cj5W62yL9'

export default function Team() {
  return (
    <div className="bg-[var(--cream)] text-[var(--ink)]">
      <header className="border-b-2 border-[var(--ink)]/20">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 py-20 sm:px-8 lg:grid-cols-[1fr_0.72fr] lg:items-end lg:px-12 lg:py-28">
          <div>
            <div className="mb-6 flex items-center gap-3 font-body text-xs font-bold uppercase tracking-[0.28em] text-[var(--cobalt)]">
              <Users aria-hidden="true" className="h-5 w-5" strokeWidth={1.8} />
              People directory
            </div>
            <h1 className="max-w-4xl font-display text-5xl leading-[0.96] tracking-tight text-[var(--midnight)] sm:text-7xl lg:text-[6.8rem]">
              The people behind the work.
            </h1>
          </div>
          <div className="border-l-4 border-[var(--cobalt)] pl-6">
            <p className="font-body text-lg font-semibold leading-7 text-[var(--midnight)] sm:text-xl">
              Meet the students and team members who make room for technology, questions, and shared momentum.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <a
                href={teamJoinUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-11 items-center gap-2 bg-[var(--midnight)] px-5 py-3 font-body text-sm font-bold text-[var(--cream)] transition hover:bg-[var(--cobalt)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sky)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--cream)]"
              >
                Join the team
                <ArrowUpRight aria-hidden="true" className="h-4 w-4" />
              </a>
              <Link
                href="/volunteer"
                className="inline-flex min-h-11 items-center border-2 border-[var(--midnight)] px-5 py-3 font-body text-sm font-bold text-[var(--midnight)] transition hover:bg-[var(--paper)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sky)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--cream)]"
              >
                Volunteer
              </Link>
            </div>
          </div>
        </div>
      </header>

      <section className="border-b border-[var(--ink)]/20 bg-[var(--paper)]">
        <div className="mx-auto max-w-7xl px-5 py-16 sm:px-8 lg:px-12 lg:py-24">
          <div className="mb-10 flex flex-col gap-4 border-b-2 border-[var(--ink)] pb-6 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="font-body text-xs font-bold uppercase tracking-[0.28em] text-[var(--cobalt)]">Current directory</p>
              <h2 className="mt-3 font-display text-4xl leading-tight text-[var(--midnight)] sm:text-5xl">Names, roles, and faces.</h2>
            </div>
            <p className="max-w-sm font-body text-sm leading-6 text-[var(--ink)]/65">
              A simple directory for the people who shape the organization today.
            </p>
          </div>

          <ul className="divide-y divide-[var(--ink)]/20 border-y border-[var(--ink)]/20">
            {teamMembers.map((member, index) => (
              <li key={member.name} className="grid gap-5 py-6 sm:grid-cols-[7rem_1fr_auto] sm:items-center sm:gap-8">
                <div className="relative h-28 w-24 overflow-hidden border-2 border-[var(--ink)]/20 bg-[var(--cream)]">
                  <Image
                    src={member.image}
                    alt={`Portrait of ${member.name}, ${member.position} at Pillars of Tech`}
                    fill
                    sizes="96px"
                    className="object-cover"
                    priority={index < 2}
                  />
                </div>
                <div>
                  <h3 className="font-display text-2xl leading-tight text-[var(--midnight)] sm:text-3xl">{member.name}</h3>
                  <p className="mt-2 font-body text-sm font-bold uppercase tracking-[0.16em] text-[var(--cobalt)]">{member.position}</p>
                </div>
                <p className="font-body text-xs font-bold uppercase tracking-[0.2em] text-[var(--ink)]/45 sm:text-right">Pillars of Tech</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="bg-[var(--midnight)] text-[var(--cream)]">
        <div className="mx-auto flex max-w-7xl flex-col gap-8 px-5 py-14 sm:px-8 lg:flex-row lg:items-end lg:justify-between lg:px-12 lg:py-20">
          <div>
            <p className="font-body text-xs font-bold uppercase tracking-[0.28em] text-[var(--sky)]">There is room for you</p>
            <h2 className="mt-4 max-w-2xl font-display text-4xl leading-tight sm:text-5xl">Bring your curiosity to the next project.</h2>
          </div>
          <div className="flex flex-wrap gap-3">
            <a
              href={teamJoinUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 items-center gap-2 bg-[var(--sky)] px-5 py-3 font-body text-sm font-bold text-[var(--midnight)] transition hover:bg-[var(--cream)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sky)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--midnight)]"
            >
              Apply to join
              <ArrowUpRight aria-hidden="true" className="h-4 w-4" />
            </a>
            <Link
              href="/volunteer"
              className="inline-flex min-h-11 items-center border-2 border-[var(--cream)] px-5 py-3 font-body text-sm font-bold text-[var(--cream)] transition hover:bg-[var(--cream)] hover:text-[var(--midnight)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sky)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--midnight)]"
            >
              Volunteer with us
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
