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
    <main className="min-h-screen bg-[var(--cream)] px-4 pb-20 pt-24 text-[var(--ink)] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="overflow-hidden rounded-[2rem] border-y-2 border-[var(--ink)] bg-[var(--midnight)] px-6 py-12 text-[var(--cream)] sm:px-10 lg:py-16">
          <div className="grid gap-10 lg:grid-cols-[1.25fr_0.75fr] lg:items-end">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.3em] text-[var(--sky)]">Presentation day / Wildcat Tank</p>
              <h1 className="mt-5 max-w-4xl font-display text-5xl leading-[0.9] sm:text-[4.8rem]">Ideas on the table.</h1>
              <p className="mt-6 max-w-2xl text-base leading-8 text-[var(--cream)]/80 sm:text-lg">A record of the judges, schedule, presentations, and final standings from Wildcat Tank.</p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/events/wildcat-tank-altamont" className="inline-flex min-h-11 items-center gap-2 bg-[var(--sky)] px-5 py-3 text-sm font-bold text-[var(--midnight)] hover:bg-[var(--cream)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--sky)] rounded-[10px]">View event page <ArrowUpRight className="h-4 w-4" aria-hidden="true" /></Link>
                <a href="/Wildcat%20Tank%20Official%20Manual.pdf" target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-2 border border-[var(--cream)] px-5 py-3 text-sm font-bold text-[var(--cream)] hover:bg-[var(--cream)] hover:text-[var(--midnight)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--sky)] rounded-[10px]"><FileText className="h-4 w-4" aria-hidden="true" /> Open manual</a>
              </div>
            </div>
            <aside className="border-l-2 border-[var(--sky)] pl-5">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--sky)]">Thank you</p>
              <p className="mt-4 text-lg leading-8 text-[var(--cream)]/85">Thank you to every student, family, and supporter who made Wildcat Tank special. Every presenter brought creativity, confidence, and effort to the stage.</p>
            </aside>
          </div>
        </header>

        <section className="grid border-b-2 border-[var(--ink)] md:grid-cols-2 xl:grid-cols-3">
          {reminders.map(([label, value]) => (
            <div key={label} className="border-b border-[var(--ink)]/30 p-5 last:border-b-0 md:odd:border-r xl:nth-[3n+1]:border-r xl:nth-[3n+2]:border-r">
              {label === 'Event date' ? <CalendarDays className="h-5 w-5 text-[var(--cobalt)]" aria-hidden="true" /> : label === 'Location' ? <MapPin className="h-5 w-5 text-[var(--cobalt)]" aria-hidden="true" /> : null}
              <p className="mt-3 text-xs font-bold uppercase tracking-[0.18em] text-[var(--cobalt)]">{label}</p>
              <p className="mt-2 text-sm font-semibold leading-7">{value}</p>
            </div>
          ))}
        </section>

        <section id="judges" className="border-b-2 border-[var(--ink)] py-12 scroll-mt-28">
          <p className="text-xs font-bold uppercase tracking-[0.28em] text-[var(--cobalt)]">The panel</p>
          <h2 className="mt-3 font-display text-5xl text-[var(--midnight)]">Meet the judges.</h2>
          <p className="mt-4 max-w-2xl text-base leading-8 text-[var(--ink)]/80">Presentation day featured judges with leadership experience in science, engineering, and innovation.</p>
          <div className="mt-8 grid gap-px overflow-hidden rounded-[2rem] border border-[var(--ink)] bg-[var(--ink)] lg:grid-cols-3">
            {judges.map((judge) => (
              <article key={judge.name} className="bg-[var(--paper)]">
                <Image src={judge.image} alt={`${judge.name}, Wildcat Tank judge`} width={500} height={500} className="aspect-square w-full object-cover" />
                <div className="p-6">
                  <h3 className="font-display text-3xl leading-tight text-[var(--midnight)]">{judge.name}</h3>
                  <p className="mt-3 text-sm font-bold leading-6 text-[var(--cobalt)]">{judge.title}</p>
                  <p className="mt-5 border-t border-[var(--ink)]/30 pt-4 text-sm leading-7 text-[var(--ink)]/75">{judge.background}</p>
                  <a href={judge.linkedin} target="_blank" rel="noopener noreferrer" className="mt-5 inline-flex min-h-11 items-center gap-2 text-sm font-bold text-[var(--cobalt)] underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--cobalt)]">View profile <ArrowUpRight className="h-4 w-4" aria-hidden="true" /></a>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section id="results" className="py-12 scroll-mt-28">
          <p className="text-xs font-bold uppercase tracking-[0.28em] text-[var(--cobalt)]">The record</p>
          <h2 className="mt-3 font-display text-5xl text-[var(--midnight)]">Final standings.</h2>
          <p className="mt-4 max-w-3xl text-base leading-8 text-[var(--ink)]/80">These are the recorded presentation-day scores. Select a project to open its timestamp in the full event recording.</p>
          <WildcatTankPodium topThree={topThree} remainingResults={remainingResults} />
        </section>
      </div>
    </main>
  )
}
