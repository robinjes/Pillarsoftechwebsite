import Image from 'next/image'
import Link from 'next/link'
import { ArrowUpRight, MoveUpRight, Users } from 'lucide-react'
import SignalPageIntro from '@/components/site/SignalPageIntro'

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
    <div className="bg-[var(--bone)] text-[var(--carbon)]">
      <SignalPageIntro
        eyebrow="TEAM / CREW WALL"
        title="The work has names."
        description="Pillars of Tech is shaped by students and collaborators who make room for technology, questions, and shared momentum. Meet the current crew, then find a way to join the next build."
        tone="carbon"
        image={{ src: '/images/events/family-science-night/IMG_0551.jpg', alt: 'Pillars volunteers and adult partners smiling together outside Family Science Night.' }}
        actions={
          <>
            <a href={teamJoinUrl} target="_blank" rel="noopener noreferrer" className="signal-button signal-button--orange">
              Join the team <ArrowUpRight aria-hidden="true" />
            </a>
            <Link href="/volunteer" className="signal-button signal-button--light">
              Volunteer <ArrowUpRight aria-hidden="true" />
            </Link>
          </>
        }
      />

      <section className="border-b border-[var(--carbon)]/30 bg-[var(--bone)]" aria-labelledby="crew-heading">
        <div className="signal-shell py-16 sm:py-24">
          <p className="signal-mono mb-5 text-[var(--ultramarine)]">Family Science Night · team moment</p>
          <div className="flex flex-col gap-5 border-b border-[var(--carbon)]/35 pb-6 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="signal-mono signal-eyebrow">01 / CURRENT CREW</p>
              <h2 id="crew-heading" className="mt-3 max-w-2xl font-display text-4xl leading-[0.98] tracking-[-0.045em] sm:text-5xl">Names, roles, and faces.</h2>
            </div>
            <p className="max-w-sm text-sm leading-6 text-[var(--carbon)]/65">A living directory for the people shaping the organization today.</p>
          </div>

          <div className="mt-10 grid grid-cols-12 items-start gap-x-3 gap-y-7 sm:gap-x-4 sm:gap-y-10" aria-label="Pillars of Tech team">
            {teamMembers.map((member, index) => (
              <article key={member.name} className={`group ${portraitLayouts[index]}`}>
                <figure className="relative aspect-[4/5] overflow-hidden border border-[var(--carbon)] bg-[var(--mist)]">
                  <Image
                    src={member.image}
                    alt={`Portrait of ${member.name}, ${member.position} at Pillars of Tech`}
                    fill
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 18vw"
                    className="object-cover transition-transform duration-500 motion-safe:group-hover:scale-[1.04] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
                    priority={index < 3}
                  />
                  <figcaption className="absolute inset-x-0 bottom-0 border-t border-[var(--off-white)]/35 bg-[var(--carbon)]/92 px-3 py-3 text-[var(--off-white)]">
                    <span className="block font-display text-lg leading-tight tracking-[-0.025em]">{member.name}</span>
                    <span className="mt-1 block text-xs font-semibold text-[var(--signal-orange)]">{member.position}</span>
                  </figcaption>
                </figure>
                <div className="mt-2 flex items-center justify-between gap-3">
                  <span className="signal-mono text-[var(--carbon)]/48">{String(index + 1).padStart(2, '0')}</span>
                  <MoveUpRight aria-hidden="true" className="h-4 w-4 text-[var(--ultramarine)]" />
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-[var(--off-white)]/25 bg-[var(--carbon)] text-[var(--off-white)]" aria-labelledby="crew-practice-heading">
        <div className="signal-shell grid gap-10 py-16 sm:py-24 lg:grid-cols-[0.65fr_1.35fr] lg:gap-20">
          <div>
            <div className="flex items-center gap-3 text-[var(--signal-orange)]">
              <Users aria-hidden="true" className="h-5 w-5" strokeWidth={1.8} />
              <p className="signal-mono">02 / HOW WE SHOW UP</p>
            </div>
            <h2 id="crew-practice-heading" className="mt-5 max-w-sm font-display text-4xl leading-[0.98] tracking-[-0.04em] sm:text-5xl">A team is a relay.</h2>
          </div>
          <div className="grid gap-px border border-[var(--off-white)]/30 bg-[var(--off-white)]/30 sm:grid-cols-3">
            <div className="bg-[var(--carbon)] p-5"><p className="signal-mono text-[var(--signal-orange)]">01</p><h3 className="mt-10 font-display text-2xl leading-none">Teach the thing.</h3><p className="mt-3 text-sm leading-6 text-[var(--off-white)]/65">Share the useful part clearly, whether you are leading the room or setting the table.</p></div>
            <div className="bg-[var(--carbon)] p-5"><p className="signal-mono text-[var(--signal-orange)]">02</p><h3 className="mt-10 font-display text-2xl leading-none">Leave a trace.</h3><p className="mt-3 text-sm leading-6 text-[var(--off-white)]/65">Document what worked so the next student can start farther forward.</p></div>
            <div className="bg-[var(--carbon)] p-5"><p className="signal-mono text-[var(--signal-orange)]">03</p><h3 className="mt-10 font-display text-2xl leading-none">Invite someone in.</h3><p className="mt-3 text-sm leading-6 text-[var(--off-white)]/65">A good event leaves a clear next step for students, families, and volunteers.</p></div>
          </div>
        </div>
      </section>

      <section className="bg-[var(--signal-orange)]" aria-labelledby="team-next-heading">
        <div className="signal-shell flex flex-col gap-8 py-14 sm:py-20 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="signal-mono text-[var(--carbon)]/70">03 / OPEN SEAT</p>
            <h2 id="team-next-heading" className="mt-3 max-w-2xl font-display text-4xl leading-[0.96] tracking-[-0.045em] sm:text-5xl">Bring your curiosity to the next project.</h2>
          </div>
          <div className="flex flex-wrap gap-3">
            <a href={teamJoinUrl} target="_blank" rel="noopener noreferrer" className="signal-button signal-button--line">Apply to join <ArrowUpRight aria-hidden="true" /></a>
            <Link href="/volunteer" className="signal-button signal-button--line">Volunteer with us <ArrowUpRight aria-hidden="true" /></Link>
          </div>
        </div>
      </section>
    </div>
  )
}
