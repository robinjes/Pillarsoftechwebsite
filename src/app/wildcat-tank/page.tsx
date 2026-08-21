import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowUpRight, CalendarDays, FileText, MapPin } from 'lucide-react'
import WildcatTankPodium from '@/components/WildcatTankPodium'

export const metadata: Metadata = {
  title: 'Wildcat Tank | Pillars of Tech',
  description: 'Judges, timeline, and event details for Wildcat Tank at Altamont Creek Elementary School.',
}

const judges = [
  {
    name: 'Randy Simpson',
    title: 'Associate Program Leader at Livermore National Laboratory',
    background: 'Propellants, Explosives, Pyrotechnics editor at Livermore National Laboratory',
    image: '/randy-simpson.jpeg',
    linkedin: 'https://www.linkedin.com/in/randy-simpson-84ab9b19/',
  },
  {
    name: 'Rick Stulen',
    title: 'Director at Quest Science Center',
    background: 'Former Vice President of Sandia National Laboratories',
    image: '/rick-stulen.jpg',
    linkedin: 'https://www.linkedin.com/in/rick-stulen-497758239/',
  },
  {
    name: 'Vaughn Dragoo',
    title: 'Senior Program Manager at Quest Science Center',
    background: 'Project Development Manager of Livermore Science and Society Center',
    image: '/vaughn-dragoo.jpg',
    linkedin: 'https://www.linkedin.com/in/vaughn-draggoo-783a3116a/',
  },
]

const results = [
  { productName: 'Kabir Robot Asst', total: 139, timestampSeconds: 561 },
  { productName: 'NextGen Powerpack:', total: 165, timestampSeconds: 885 },
  { productName: 'Social Signs', total: 193, timestampSeconds: 1270 },
  { productName: 'DrinkBuddy', total: 168, timestampSeconds: 1593 },
  { productName: 'Packy', total: 176, timestampSeconds: 1955 },
  { productName: 'Natures Magic Creations', total: 182, timestampSeconds: 2447 },
  { productName: 'Chiming To Do List', total: 141, timestampSeconds: 2329 },
  { productName: 'Helio Bloom', total: 192, timestampSeconds: 3040 },
  { productName: 'Hydra Buddy', total: 184, timestampSeconds: 3420 },
  { productName: 'Glow Flow Smart Water Bottle', total: 178, timestampSeconds: 3869 },
  { productName: 'ROL Sorter', total: 130, timestampSeconds: 4162 },
  { productName: 'Aqua Smart Pot', total: 158, timestampSeconds: 4455 },
  { productName: 'Kitchen Social Network', total: 155, timestampSeconds: 4814 },
  { productName: 'Elves', total: 167, timestampSeconds: 5030 },
  { productName: 'Pee Band', total: 127, timestampSeconds: 5293 },
  { productName: 'Panic Pals', total: 161, timestampSeconds: 5583 },
  { productName: 'Magic Soap', total: 133, timestampSeconds: 5809 },
  { productName: 'Smart Allergy Detection', total: 119, timestampSeconds: 5984 },
  { productName: 'Air Q Sense Glasses', total: 122, timestampSeconds: 6294 },
  { productName: 'AI Reading Buddy', total: 180, timestampSeconds: 6565 },
]

const reminders = [
  ['Event date', 'March 25, 2026'],
  ['Time', '6:00 PM – 8:00 PM'],
  ['Location', 'Altamont Creek Elementary School (MPR)'],
  ['Presentation ready', 'Students should bring their project drawing and be ready to present.'],
  ['STEM activity', 'Students can choose a marshmallow structural strength and efficiency activity while they pass the time.'],
  ['Food & drinks', 'Food and drinks will be complimentary for attendees.'],
]

const fullEventVideo = 'https://www.youtube.com/watch?v=ZT57W8NaZeU'

function formatTimestamp(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const remainder = seconds % 60
  const minuteLabel = minutes.toString().padStart(hours > 0 ? 2 : 1, '0')
  const secondLabel = remainder.toString().padStart(2, '0')
  return hours > 0 ? `${hours}:${minuteLabel}:${secondLabel}` : `${minutes}:${secondLabel}`
}

function timestampUrl(seconds: number): string {
  const url = new URL(fullEventVideo)
  url.searchParams.set('t', `${seconds}s`)
  return url.toString()
}

export default function WildcatTankPage() {
  const rankedResults = [...results]
    .sort((a, b) => b.total - a.total)
    .map((entry, index) => ({
      ...entry,
      rank: index + 1,
      videoUrl: timestampUrl(entry.timestampSeconds),
      timestampLabel: formatTimestamp(entry.timestampSeconds),
    }))
  const topThree = rankedResults.slice(0, 3)
  const remainingResults = rankedResults.slice(3)

  return (
    <main className="min-h-screen bg-[var(--bone)] pb-20 pt-12 text-[var(--carbon)] selection:bg-[var(--cream)] sm:pt-16">
      <div className="signal-shell">
        <header className="border-y border-[var(--ink)] bg-[var(--carbon)] px-5 py-12 text-[var(--off-white)] sm:px-10 lg:py-16">
          <div className="grid gap-10 lg:grid-cols-[1.25fr_0.75fr] lg:items-end">
            <div>
              <p className="signal-mono signal-eyebrow">WILDCAT TANK / COMPETITION SCOREBOARD</p>
              <h1 className="mt-5 max-w-4xl font-display text-5xl leading-[0.9] tracking-[-0.05em] sm:text-[4.35rem]">Ideas on the table.</h1>
              <p className="mt-6 max-w-2xl text-base leading-8 text-[var(--off-white)]/72 sm:text-lg">A record of the judges, schedule, presentations, and final standings from Wildcat Tank.</p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/events/wildcat-tank-altamont" className="signal-button signal-button--orange">View event page <ArrowUpRight className="h-4 w-4" aria-hidden="true" /></Link>
                <a href="/Wildcat%20Tank%20Official%20Manual.pdf" target="_blank" rel="noopener noreferrer" className="signal-button signal-button--light"><FileText className="h-4 w-4" aria-hidden="true" /> Open manual</a>
              </div>
            </div>
            <aside className="border-l border-[var(--signal-orange)] pl-5">
              <p className="signal-mono text-[var(--signal-orange)]">THANK YOU</p>
              <p className="mt-4 text-lg leading-8 text-[var(--off-white)]/78">Thank you to every student, family, and supporter who made Wildcat Tank special. Every presenter brought creativity, confidence, and effort to the stage.</p>
            </aside>
          </div>
        </header>

        <section className="grid border-b border-[var(--carbon)] md:grid-cols-2 xl:grid-cols-3">
          {reminders.map(([label, value]) => (
            <div key={label} className="border-b border-[var(--carbon)]/25 p-5 last:border-b-0 md:odd:border-r xl:nth-[3n+1]:border-r xl:nth-[3n+2]:border-r">
              {label === 'Event date' ? <CalendarDays className="h-5 w-5 text-[var(--ultramarine)]" aria-hidden="true" /> : label === 'Location' ? <MapPin className="h-5 w-5 text-[var(--ultramarine)]" aria-hidden="true" /> : null}
              <p className="signal-mono mt-3 text-[var(--ultramarine)]">{label}</p>
              <p className="mt-2 text-sm font-semibold leading-7">{value}</p>
            </div>
          ))}
        </section>

        <section id="judges" className="border-b border-[var(--carbon)] py-14 scroll-mt-28 sm:py-20">
          <p className="signal-mono signal-eyebrow">01 / THE PANEL</p>
          <h2 className="mt-3 font-display text-4xl leading-[0.98] tracking-[-0.045em] text-[var(--carbon)] sm:text-5xl">Meet the judges.</h2>
          <p className="mt-4 max-w-2xl text-base leading-8 text-[var(--carbon)]/72">Presentation day featured judges with leadership experience in science, engineering, and innovation.</p>
          <div className="mt-8 grid gap-px border border-[var(--carbon)] bg-[var(--carbon)] lg:grid-cols-3">
            {judges.map((judge, index) => (
              <article key={judge.name} className="bg-[var(--off-white)]">
                <Image src={judge.image} alt={`${judge.name}, Wildcat Tank judge`} width={500} height={500} className="aspect-square w-full object-cover" />
                <div className="p-6">
                  <p className="signal-mono text-[var(--signal-orange)]">0{index + 1} / JUDGE</p>
                  <h3 className="mt-4 font-display text-3xl leading-tight tracking-[-0.04em] text-[var(--carbon)]">{judge.name}</h3>
                  <p className="mt-3 text-sm font-bold leading-6 text-[var(--ultramarine)]">{judge.title}</p>
                  <p className="mt-5 border-t border-[var(--carbon)]/30 pt-4 text-sm leading-7 text-[var(--carbon)]/72">{judge.background}</p>
                  <a href={judge.linkedin} target="_blank" rel="noopener noreferrer" className="signal-text-link mt-5 inline-flex min-h-11 items-center gap-2">View profile <ArrowUpRight className="h-4 w-4" aria-hidden="true" /></a>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section id="results" className="py-14 scroll-mt-28 sm:py-20">
          <p className="signal-mono signal-eyebrow">02 / THE RECORD</p>
          <h2 className="mt-3 font-display text-4xl leading-[0.98] tracking-[-0.045em] text-[var(--carbon)] sm:text-5xl">Final standings.</h2>
          <p className="mt-4 max-w-3xl text-base leading-8 text-[var(--carbon)]/72">These are the recorded presentation-day scores. Select a project to open its timestamp in the full event recording.</p>
          <WildcatTankPodium topThree={topThree} remainingResults={remainingResults} />
        </section>
      </div>
    </main>
  )
}
