import type { Metadata } from 'next'
import Link from 'next/link'

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
  },
  {
    name: 'Rick Stulen',
    title: 'Director at Quest Science Center',
    background: 'Former Vice President of Sandia National Laboratories',
    image: '/rick-stulen.jpg',
    initials: 'RS',
  },
  {
    name: 'Vaughn Dragoo',
    title: 'Senior Program Manager at Quest Science Center',
    background: 'Project Development Manager of Livermore Science and Society Center',
    image: '/vaughn-dragoo.jpg',
    initials: 'VD',
  },
]

const roundOne = [
  { slot: 1, start: '6:05 PM', presenter: 'Mia Vineeth', end: '6:09 PM' },
  { slot: 2, start: '6:09 PM', presenter: 'Kabir Chhabra', end: '6:13 PM' },
  { slot: 3, start: '6:13 PM', presenter: 'Samaira Talla & Audrey Honeker (Team 1)', end: '6:17 PM', team: true },
  { slot: 4, start: '6:17 PM', presenter: 'Lucas Cardella', end: '6:21 PM' },
  { slot: 5, start: '6:21 PM', presenter: 'Srihitha Innamuri', end: '6:25 PM' },
  { slot: 6, start: '6:25 PM', presenter: 'Hazel Khanna', end: '6:29 PM' },
  { slot: 7, start: '6:29 PM', presenter: 'Reyansh Mundhada & Nevaan Patadia (Team 2)', end: '6:33 PM', team: true },
  { slot: 8, start: '6:33 PM', presenter: 'Zaina Patel', end: '6:37 PM' },
  { slot: 9, start: '6:37 PM', presenter: 'Ayush Sagar', end: '6:41 PM' },
  { slot: 10, start: '6:41 PM', presenter: 'Shanaya Aggarwal', end: '6:45 PM' },
  { slot: 11, start: '6:45 PM', presenter: 'Sarah Harr & Taarika Kumaran (Team 3)', end: '6:49 PM', team: true },
  { slot: 12, start: '6:49 PM', presenter: 'Atharv Sharma & Alishka Sharma (Team 6)', end: '6:53 PM', team: true },
  { slot: 13, start: '6:53 PM', presenter: 'Ayra Sharda', end: '6:57 PM' },
]

const roundTwo = [
  { slot: 14, start: '7:02 PM', presenter: 'Sriya Mahapatra', end: '7:06 PM' },
  { slot: 15, start: '7:06 PM', presenter: 'Anvitha Majji & Tara Cheriyan (Team 4)', end: '7:10 PM', team: true },
  { slot: 16, start: '7:10 PM', presenter: 'Zain Nayak', end: '7:14 PM' },
  { slot: 17, start: '7:14 PM', presenter: 'Allison Panas', end: '7:18 PM' },
  { slot: 18, start: '7:18 PM', presenter: 'Akira Goyel', end: '7:22 PM' },
  { slot: 19, start: '7:22 PM', presenter: 'Jeswin Shanchu', end: '7:26 PM' },
  { slot: 20, start: '7:26 PM', presenter: 'Sukeerthi Jeedi, Tanvi Kaja & Akkshitha Kiran (Team 5)', end: '7:30 PM', team: true },
  { slot: 21, start: '7:30 PM', presenter: 'Stella Michon', end: '7:34 PM' },
  { slot: 22, start: '7:34 PM', presenter: 'Evan Way', end: '7:38 PM' },
  { slot: 23, start: '7:38 PM', presenter: 'Kodhai Mohanram', end: '7:42 PM' },
  { slot: 24, start: '7:42 PM', presenter: 'Matthias Tedros', end: '7:46 PM' },
  { slot: 25, start: '7:46 PM', presenter: 'Atharv Sharma', end: '7:50 PM' },
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
    value: 'Students will also complete a marshmallow structural strength and efficiency activity.',
  },
  {
    label: 'Food & Drinks',
    value: 'Snacks will be sold at a low cost, and water will be complimentary.',
  },
]

export default function WildcatTankPage() {
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
                  Everything families need for presentation day in one place: judges, time sheet,
                  required forms, and event details in one place.
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
                  Quick Links
                </p>
                <div className="relative mt-6 flex flex-wrap gap-4">
                  <a
                    href="#judges"
                    className="rounded-full border border-white/20 bg-white/15 px-6 py-3 text-lg font-bold text-white shadow-[0_0_20px_rgba(255,255,255,0.08)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-white/25 hover:shadow-[0_0_24px_rgba(255,255,255,0.2)]"
                  >
                    Judges
                  </a>
                  <a
                    href="#timesheet"
                    className="rounded-full border border-white/20 bg-white/15 px-6 py-3 text-lg font-bold text-white shadow-[0_0_20px_rgba(255,255,255,0.08)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-white/25 hover:shadow-[0_0_24px_rgba(255,255,255,0.2)]"
                  >
                    Time Sheet
                  </a>
                  <a
                    href="#project-form"
                    className="rounded-full border border-white/20 bg-white/15 px-6 py-3 text-lg font-bold text-white shadow-[0_0_20px_rgba(255,255,255,0.08)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-white/25 hover:shadow-[0_0_24px_rgba(255,255,255,0.2)]"
                  >
                    Project Form
                  </a>
                  <a
                    href="#media-release"
                    className="rounded-full border border-white/20 bg-white/15 px-6 py-3 text-lg font-bold text-white shadow-[0_0_20px_rgba(255,255,255,0.08)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-white/25 hover:shadow-[0_0_24px_rgba(255,255,255,0.2)]"
                  >
                    Media Release
                  </a>
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
            {judges.map((judge) => (
              <article
                key={judge.name}
                className="flex h-full flex-col overflow-hidden rounded-3xl border border-white/10 bg-white/5 shadow-xl"
              >
                <div className="flex min-h-[21rem] items-center justify-center bg-gradient-to-br from-blue-300/20 via-white/10 to-slate-950/40 p-8">
                  {judge.image ? (
                    <img
                      src={judge.image}
                      alt={judge.name}
                      className="h-56 w-56 rounded-3xl object-cover shadow-2xl"
                    />
                  ) : (
                    <div className="flex h-56 w-56 items-center justify-center rounded-3xl border border-white/15 bg-slate-900/60 text-5xl font-black tracking-tight text-white shadow-2xl">
                      {judge.initials}
                    </div>
                  )}
                </div>

                <div className="flex flex-1 flex-col p-6">
                  <div className="min-h-[8.5rem]">
                    <h3 className="text-2xl font-black text-white">{judge.name}</h3>
                    <p className="mt-2 text-base font-semibold leading-7 text-blue-100">
                      {judge.title}
                    </p>
                  </div>

                  <div className="mt-4 flex-1 rounded-2xl border border-white/10 bg-slate-950/30 p-4">
                    <p className="text-xs font-extrabold uppercase tracking-[0.25em] text-blue-300">
                      Background
                    </p>
                    <p className="mt-3 text-sm leading-7 text-blue-100">{judge.background}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section id="timesheet" className="mt-8 grid scroll-mt-28 gap-8 lg:grid-cols-[0.95fr,1.05fr]">
          <article className="rounded-3xl border border-white/10 bg-slate-950/20 p-8 shadow-xl lg:col-span-2">
            <h2 className="text-2xl font-black text-white">Time Sheet</h2>
            <p className="mt-3 text-sm leading-7 text-blue-100">
              Presentation day runs on 4-minute slots: 2 minutes to present, 1 minute for Q&amp;A,
              and 1 minute for transition.
            </p>

            <div className="mt-4 rounded-2xl border border-amber-300/20 bg-amber-100/10 px-4 py-4 text-sm leading-7 text-amber-100">
              Participants should arrive 10 minutes before their presentation time. Families are
              also welcome to stay for the entire event if they would like to.
            </div>

            <div className="mt-6 space-y-8">
              <section className="rounded-3xl border border-white/10 bg-white/5 p-5">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <h3 className="text-xl font-black text-white">Round 1</h3>
                  <p className="text-sm font-semibold text-blue-200">Opening remarks: 6:00 PM - 6:05 PM</p>
                </div>

                <div className="mt-4 overflow-hidden rounded-2xl border border-white/10">
                  <div className="grid grid-cols-[72px_110px_minmax(0,1fr)_110px] bg-[#5a4ec4] px-4 py-3 text-sm font-bold text-white">
                    <div>#</div>
                    <div>Start</div>
                    <div>Presenter</div>
                    <div className="text-right">End</div>
                  </div>
                  {roundOne.map((entry) => (
                    <div
                      key={entry.slot}
                      className={`grid grid-cols-[72px_110px_minmax(0,1fr)_110px] items-center gap-2 border-t border-white/10 px-4 py-3 text-sm ${
                        entry.team ? 'bg-[#d8d6f5] text-[#4f46b8]' : 'bg-[#f4f1ea] text-slate-800'
                      }`}
                    >
                      <div className="font-medium">{entry.slot}</div>
                      <div>{entry.start}</div>
                      <div className={entry.team ? 'font-bold' : 'font-medium'}>{entry.presenter}</div>
                      <div className="text-right">{entry.end}</div>
                    </div>
                  ))}
                </div>

                <div className="mt-4 rounded-2xl border border-[#e8c98b]/30 bg-[#f5e7c7] px-4 py-3 text-center text-sm font-bold text-[#9a6a16]">
                  5-minute break: 6:57 PM - 7:02 PM
                </div>
              </section>

              <section className="rounded-3xl border border-white/10 bg-white/5 p-5">
                <h3 className="text-xl font-black text-white">Round 2</h3>

                <div className="mt-4 overflow-hidden rounded-2xl border border-white/10">
                  <div className="grid grid-cols-[72px_110px_minmax(0,1fr)_110px] bg-[#5a4ec4] px-4 py-3 text-sm font-bold text-white">
                    <div>#</div>
                    <div>Start</div>
                    <div>Presenter</div>
                    <div className="text-right">End</div>
                  </div>
                  {roundTwo.map((entry) => (
                    <div
                      key={entry.slot}
                      className={`grid grid-cols-[72px_110px_minmax(0,1fr)_110px] items-center gap-2 border-t border-white/10 px-4 py-3 text-sm ${
                        entry.team ? 'bg-[#d8d6f5] text-[#4f46b8]' : 'bg-[#f4f1ea] text-slate-800'
                      }`}
                    >
                      <div className="font-medium">{entry.slot}</div>
                      <div>{entry.start}</div>
                      <div className={entry.team ? 'font-bold' : 'font-medium'}>{entry.presenter}</div>
                      <div className="text-right">{entry.end}</div>
                    </div>
                  ))}
                </div>

                <div className="mt-4 rounded-2xl border border-white/10 bg-[#f4f1ea] px-4 py-3 text-sm font-medium text-slate-800">
                  Wrap-up / clean-up: 7:50 PM onward
                </div>

                <div className="mt-4 rounded-2xl border border-white/10 bg-[#d8d6f5] px-4 py-3 text-center text-sm font-medium text-[#4f46b8]">
                  Team rows are highlighted in purple. 25 total presentation slots. Event wraps by
                  7:50 PM.
                </div>
              </section>
            </div>
          </article>
        </section>

        <section className="mt-8 rounded-3xl border border-white/10 bg-slate-950/20 p-8 shadow-xl">
          <h2 className="text-2xl font-black text-white">Forms</h2>
          <p className="mt-3 text-sm leading-7 text-blue-100">
            You can complete both required forms directly on this page.
          </p>

          <div className="mt-8 grid gap-8 xl:grid-cols-2">
            <article id="project-form" className="scroll-mt-28 rounded-3xl border border-white/10 bg-white/5 p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-xl font-black text-white">Project Information Form</h3>
                  <p className="mt-2 text-sm text-blue-100">
                    Submit presenter and project details before presentation day.
                  </p>
                </div>
                <a
                  href="https://docs.google.com/forms/d/e/1FAIpQLScxCraJkdIUaX50Rl5RUxAWJXw5RWpFMEFtnWa9sSniw5Udnw/viewform"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-white/20"
                >
                  Open in new tab
                </a>
              </div>

              <div className="mt-5 overflow-hidden rounded-2xl border border-white/10 bg-white">
                <iframe
                  src="https://docs.google.com/forms/d/e/1FAIpQLScxCraJkdIUaX50Rl5RUxAWJXw5RWpFMEFtnWa9sSniw5Udnw/viewform?embedded=true"
                  className="w-full"
                  style={{ height: '1450px' }}
                  title="Wildcat Tank Project Information Form"
                >
                  Loading...
                </iframe>
              </div>
            </article>

            <article id="media-release" className="scroll-mt-28 rounded-3xl border border-white/10 bg-white/5 p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-xl font-black text-white">Media Release Form</h3>
                  <p className="mt-2 text-sm text-blue-100">
                    Complete the media release form for event photography and media permissions.
                  </p>
                </div>
                <a
                  href="https://docs.google.com/forms/d/e/1FAIpQLSds_ybhnoHfUSgTPgNBJF5M9BmkMfHRrFXHCGwDZwlLy8XNkQ/viewform"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-white/20"
                >
                  Open in new tab
                </a>
              </div>

              <div className="mt-5 overflow-hidden rounded-2xl border border-white/10 bg-white">
                <iframe
                  src="https://docs.google.com/forms/d/e/1FAIpQLSds_ybhnoHfUSgTPgNBJF5M9BmkMfHRrFXHCGwDZwlLy8XNkQ/viewform?embedded=true"
                  className="w-full"
                  style={{ height: '2120px' }}
                  title="Wildcat Tank Media Release Form"
                >
                  Loading...
                </iframe>
              </div>
            </article>
          </div>
        </section>

      </div>
    </main>
  )
}
