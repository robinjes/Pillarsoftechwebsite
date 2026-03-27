import type { Metadata } from 'next'
import Link from 'next/link'
import WildcatTankPodium from '@/components/WildcatTankPodium'

export const metadata: Metadata = {
  title: 'Wildcat Tank | Pillars of Tech',
  description: 'Judges, timeline, and event details for Wildcat Tank at Altamont Elementary.',
}

const judges = [
  {
    name: 'Randy Simpson',
    title: 'Associate Program Leader at Livermore National Laboratory',
    background: 'Propellants, Explosives, Pyrotechnics editor at Livermore National Laboratory',
    image: '/randy-simpson.jpeg',
    initials: 'RS',
    linkedin: 'https://www.linkedin.com/in/randy-simpson-84ab9b19/',
  },
  {
    name: 'Rick Stulen',
    title: 'Director at Quest Science Center',
    background: 'Former Vice President of Sandia National Laboratories',
    image: '/rick-stulen.jpg',
    initials: 'RS',
    linkedin: 'https://www.linkedin.com/in/rick-stulen-497758239/',
  },
  {
    name: 'Vaughn Dragoo',
    title: 'Senior Program Manager at Quest Science Center',
    background: 'Project Development Manager of Livermore Science and Society Center',
    image: '/vaughn-dragoo.jpg',
    initials: 'VD',
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
  {
    label: 'Event Date',
    value: 'March 25, 2026',
  },
  {
    label: 'Time',
    value: '6:00 PM - 8:00 PM',
  },
  {
    label: 'Location',
    value: 'Altamont Elementary School (MPR)',
  },
  {
    label: 'Presentation Ready',
    value: 'Students should bring their project drawing and be ready to present.',
  },
  {
    label: 'STEM Activity',
    value: 'Students can choose to do a marshmallow structural strength and efficiency activity while they pass the time.',
  },
  {
    label: 'Food & Drinks',
    value: 'Food and drinks will be complimentary for attendees.',
  },
]

const WILDCAT_TANK_FULL_EVENT_VIDEO = 'https://www.youtube.com/watch?v=ZT57W8NaZeU'

const formatTimestamp = (seconds: number) => {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const remainingSeconds = seconds % 60
  const mm = minutes.toString().padStart(hours > 0 ? 2 : 1, '0')
  const ss = remainingSeconds.toString().padStart(2, '0')

  return hours > 0 ? `${hours}:${mm}:${ss}` : `${minutes}:${ss}`
}

const buildTimestampUrl = (baseUrl: string, seconds: number) => {
  try {
    const url = new URL(baseUrl)
    url.searchParams.set('t', `${seconds}s`)
    return url.toString()
  } catch {
    return `${baseUrl}${baseUrl.includes('?') ? '&' : '?'}t=${seconds}s`
  }
}

export default function WildcatTankPage() {
  const rankedResults = [...results]
    .sort((a, b) => b.total - a.total)
    .map((entry, index) => ({
      ...entry,
      rank: index + 1,
      videoUrl:
        entry.timestampSeconds !== undefined
          ? buildTimestampUrl(WILDCAT_TANK_FULL_EVENT_VIDEO, entry.timestampSeconds)
          : undefined,
      timestampLabel:
        entry.timestampSeconds !== undefined ? formatTimestamp(entry.timestampSeconds) : undefined,
    }))

  const topThree = rankedResults.slice(0, 3)
  const remainingResults = rankedResults.slice(3)

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#11265e] via-[#15307a] to-[#0f1f4d] px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <section className="relative overflow-hidden rounded-[2rem] border border-white/15 bg-white/10 p-6 shadow-2xl shadow-black/20 backdrop-blur-2xl sm:p-8 lg:p-10">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.18),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(147,197,253,0.18),transparent_24%)]" />
          <div className="pointer-events-none absolute -left-16 top-10 h-40 w-40 rounded-full bg-white/10 blur-3xl" />
          <div className="pointer-events-none absolute right-0 top-0 h-48 w-48 rounded-full bg-blue-300/10 blur-3xl" />

          <div className="relative">
            <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
              <div className="rounded-[1.75rem] border border-white/15 bg-white/8 p-6 backdrop-blur-xl sm:p-8">
                <p className="mb-4 text-sm font-bold uppercase tracking-[0.38em] text-blue-200/90">
                  Shareable Event Page
                </p>
                <h1 className="text-5xl font-black tracking-tight text-white sm:text-6xl">
                  Wildcat Tank
                </h1>
                <p className="mt-5 max-w-3xl text-lg leading-9 text-blue-50/90">
                  A celebration page for Wildcat Tank featuring the judges, final results, and
                  highlights from an amazing presentation day.
                </p>

                <div className="mt-8 flex flex-wrap gap-3">
                  <Link
                    href="/events/wildcat-tank-altamont"
                    className="rounded-full bg-white px-6 py-3 text-sm font-bold text-slate-900 shadow-lg shadow-black/10 transition-all hover:-translate-y-0.5 hover:bg-blue-50"
                  >
                    View event page
                  </Link>
                  <a
                    href="/Wildcat%20Tank%20Official%20Manual.pdf"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-full border border-white/20 bg-white/10 px-6 py-3 text-sm font-bold text-white transition-all hover:-translate-y-0.5 hover:bg-white/20"
                  >
                    Open PDF manual
                  </a>
                </div>
              </div>

              <div className="relative overflow-hidden rounded-[1.75rem] border border-white/20 bg-slate-950/20 p-6 backdrop-blur-xl sm:p-8">
                <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(120deg,transparent_18%,rgba(255,255,255,0.08)_28%,rgba(255,255,255,0.22)_34%,rgba(255,255,255,0.08)_40%,transparent_52%)] bg-[length:220%_100%] animate-[shine_3.8s_linear_infinite]" />
                <div className="pointer-events-none absolute -top-10 right-6 h-24 w-24 rounded-full bg-white/10 blur-2xl" />
                <p className="relative text-2xl font-black uppercase tracking-[0.24em] text-white drop-shadow-[0_0_18px_rgba(255,255,255,0.25)] sm:text-3xl">
                  Thank You
                </p>
                <div className="relative mt-6 rounded-[1.5rem] border border-white/15 bg-white/10 p-6 shadow-[0_0_28px_rgba(255,255,255,0.08)]">
                  <p className="text-lg font-semibold leading-9 text-blue-50">
                    Thank you to every student, family, and supporter who made Wildcat Tank so
                    special. We thought everybody&apos;s presentations were amazing, and we were so
                    impressed by the creativity, confidence, and effort each presenter brought to
                    the stage.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {reminders.map((reminder) => (
                <div
                  key={reminder.label}
                  className="rounded-[1.5rem] border border-white/15 bg-slate-950/20 p-5 backdrop-blur-xl"
                >
                  <p className="text-xs font-extrabold uppercase tracking-[0.28em] text-blue-300/90">
                    {reminder.label}
                  </p>
                  <p className="mt-3 text-base font-semibold leading-7 text-white/95">
                    {reminder.value}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="judges" className="mt-8 scroll-mt-28 rounded-3xl border border-white/10 bg-slate-950/20 p-8 shadow-xl">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-2xl font-black text-white">Meet The Judges</h2>
              <p className="mt-3 text-sm leading-7 text-blue-100">
                Presentation day features judges with leadership experience in science, engineering,
                and innovation.
              </p>
            </div>
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-3">
            {judges.map((judge) => {
              const cardContent = (
                <>
                  <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                    <div className="absolute inset-x-6 top-4 h-20 rounded-full bg-cyan-300/20 blur-3xl" />
                    <div className="absolute inset-x-10 bottom-6 h-16 rounded-full bg-blue-200/20 blur-3xl" />
                  </div>

                  <div className="relative flex min-h-[21rem] items-center justify-center bg-gradient-to-br from-blue-300/20 via-white/10 to-slate-950/40 p-8">
                    {judge.image ? (
                      <img
                        src={judge.image}
                        alt={judge.name}
                        className="h-56 w-56 rounded-3xl object-cover shadow-2xl transition-transform duration-300 group-hover:scale-[1.02]"
                      />
                    ) : (
                      <div className="flex h-56 w-56 items-center justify-center rounded-3xl border border-white/15 bg-slate-900/60 text-5xl font-black tracking-tight text-white shadow-2xl">
                        {judge.initials}
                      </div>
                    )}
                  </div>

                  <div className="relative flex flex-1 flex-col p-6">
                    <div className="min-h-[8.5rem]">
                      <h3 className="text-2xl font-black text-white">{judge.name}</h3>
                      <p className="mt-2 text-base font-semibold leading-7 text-blue-100">
                        {judge.title}
                      </p>
                    </div>

                    <div className="mt-4 flex-1 rounded-2xl border border-white/10 bg-slate-950/30 p-4 transition-colors duration-300 group-hover:border-cyan-200/30 group-hover:bg-slate-950/40">
                      <p className="text-xs font-extrabold uppercase tracking-[0.25em] text-blue-300">
                        Background
                      </p>
                      <p className="mt-3 text-sm leading-7 text-blue-100">{judge.background}</p>
                    </div>
                  </div>
                </>
              )

              const cardClassName =
                'group relative flex h-full flex-col overflow-hidden rounded-3xl border border-white/10 bg-white/5 shadow-xl transition-all duration-300 hover:-translate-y-1 hover:border-cyan-200/50 hover:shadow-[0_0_35px_rgba(103,232,249,0.28)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200/80'

              return judge.linkedin ? (
                <a
                  key={judge.name}
                  href={judge.linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`${judge.name} on LinkedIn`}
                  className={cardClassName}
                >
                  {cardContent}
                </a>
              ) : (
                <article
                  key={judge.name}
                  className={`${cardClassName} cursor-default`}
                >
                  {cardContent}
                </article>
              )
            })}
          </div>
        </section>

        <section id="results" className="mt-8 grid scroll-mt-28 gap-8 lg:grid-cols-[0.95fr,1.05fr]">
          <article className="rounded-3xl border border-white/10 bg-slate-950/20 p-8 shadow-xl lg:col-span-2">
            <h2 className="text-2xl font-black text-white">Results</h2>
            <p className="mt-3 text-sm leading-7 text-blue-100">
              Here are the final combined totals from Wildcat Tank presentation day. Every team
              brought creative ideas, strong problem-solving, and impressive presentation energy.
            </p>

            <div className="mt-4 rounded-2xl border border-amber-300/20 bg-amber-100/10 px-4 py-4 text-sm leading-7 text-amber-100">
              Congratulations to all presenters. Here are the final standings from first place to
              last, with a podium spotlight for the top 3 projects.
            </div>

            <WildcatTankPodium topThree={topThree} remainingResults={remainingResults} />
          </article>
        </section>

      </div>
    </main>
  )
}
