import Link from 'next/link'
import { ArrowUpRight, Boxes, CircuitBoard, Cpu, Printer, Radio, Wrench } from 'lucide-react'

const wishlistItems = [
  {
    title: 'Microcontrollers',
    icon: Cpu,
    description: 'Boards like Arduino and micro:bit support lessons in programming, sensors, and electronics through hands-on builds.',
    useCase: 'Workshop starter kits',
  },
  {
    title: 'Laptops and Chromebooks',
    icon: CircuitBoard,
    description: 'Reliable laptops help students code, research, and run workshop software during a session.',
    useCase: 'Student coding stations',
  },
  {
    title: 'Robotics Components',
    icon: CircuitBoard,
    description: 'Motors, wheels, servos, and sensor packs make robot demonstrations tangible and changeable.',
    useCase: 'Robot prototypes',
  },
  {
    title: 'Chargers and Power Strips',
    icon: Wrench,
    description: 'Extra chargers, USB-C cables, and power strips keep devices ready during workshop days.',
    useCase: 'Device support',
  },
  {
    title: '3D Printer Materials',
    icon: Printer,
    description: 'Filament, nozzles, and upkeep parts support custom mounts, cases, and printable workshop parts.',
    useCase: 'Printable hardware',
  },
  {
    title: 'Soldering Supplies',
    icon: Wrench,
    description: 'Solder, wire, and replacement tips support repair lessons and durable electronics projects.',
    useCase: 'Repair and build labs',
  },
  {
    title: 'Sensors and Input Modules',
    icon: Radio,
    description: 'Distance, temperature, light, and motion sensors power experiments that connect STEM concepts to data.',
    useCase: 'Interactive demos',
  },
  {
    title: 'Storage and Organizers',
    icon: Boxes,
    description: 'Bins, cases, and labeled organizers keep small parts sorted for mobile workshop kits.',
    useCase: 'Portable workshop kits',
  },
  {
    title: 'Tablets and Input Devices',
    icon: Radio,
    description: 'Tablets, mice, and keyboards support flexible stations for younger learners and accessible activities.',
    useCase: 'Flexible learning stations',
  },
] as const

export default function WishlistPage() {
  return (
    <main className="min-h-screen overflow-x-hidden bg-[var(--cream)] pt-16 text-[var(--ink)]">
      <header className="border-b-2 border-[var(--ink)]/20">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 py-20 sm:px-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-end lg:px-12 lg:py-28">
          <div>
            <p className="mb-6 font-body text-xs font-bold uppercase tracking-[0.28em] text-[var(--cobalt)]">Wishlist / Practical support</p>
            <h1 className="max-w-4xl font-display text-5xl leading-[0.96] tracking-tight text-[var(--midnight)] sm:text-7xl lg:text-[6.8rem]">
              The tools behind the next workshop.
            </h1>
          </div>
          <div className="border-l-4 border-[var(--cobalt)] pl-6">
            <p className="font-body text-lg leading-8 text-[var(--ink)]/75 sm:text-xl">
              These are the supplies our student-led STEM organization is currently collecting for hands-on sessions.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/contact?reason=wishlist"
                className="inline-flex min-h-11 items-center gap-2 bg-[var(--midnight)] px-5 py-3 font-body text-sm font-bold text-[var(--cream)] transition hover:bg-[var(--cobalt)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sky)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--cream)]"
              >
                Coordinate a donation
                <ArrowUpRight aria-hidden="true" className="h-4 w-4" />
              </Link>
              <Link
                href="/faq"
                className="inline-flex min-h-11 items-center border-2 border-[var(--midnight)] px-5 py-3 font-body text-sm font-bold text-[var(--midnight)] transition hover:bg-[var(--paper)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sky)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--cream)]"
              >
                Read the FAQ
              </Link>
            </div>
          </div>
        </div>
      </header>

      <section className="border-b border-[var(--ink)]/20 bg-[var(--paper)]">
        <div className="mx-auto max-w-7xl px-5 py-16 sm:px-8 lg:px-12 lg:py-24">
          <div className="mb-10 flex flex-col gap-4 border-b-2 border-[var(--ink)] pb-6 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="font-body text-xs font-bold uppercase tracking-[0.28em] text-[var(--cobalt)]">Current list</p>
              <h2 className="mt-3 font-display text-4xl leading-tight text-[var(--midnight)] sm:text-5xl">Choose a useful next step.</h2>
            </div>
            <p className="max-w-sm font-body text-sm leading-6 text-[var(--ink)]/65">
              Have another item in mind? The same contact route works for that, too.
            </p>
          </div>

          <div className="divide-y divide-[var(--ink)]/20 border-y border-[var(--ink)]/20">
            {wishlistItems.map((item, index) => {
              const Icon = item.icon

              return (
                <article key={item.title} className="grid gap-5 py-7 sm:grid-cols-[4rem_0.8fr_1.2fr_auto] sm:items-center sm:gap-7">
                  <div className="flex h-14 w-14 items-center justify-center border-2 border-[var(--ink)]/20 bg-[var(--cream)] text-[var(--cobalt)]">
                    <Icon aria-hidden="true" className="h-7 w-7" strokeWidth={1.7} />
                  </div>
                  <div>
                    <p className="font-body text-xs font-bold uppercase tracking-[0.2em] text-[var(--cobalt)]">0{index + 1} / {item.useCase}</p>
                    <h3 className="mt-2 font-display text-2xl leading-tight text-[var(--midnight)]">{item.title}</h3>
                  </div>
                  <p className="font-body text-base leading-7 text-[var(--ink)]/70">{item.description}</p>
                  <Link
                    href="/contact?reason=wishlist"
                    className="inline-flex min-h-11 items-center justify-center gap-2 border-2 border-[var(--midnight)] px-4 py-3 font-body text-sm font-bold text-[var(--midnight)] transition hover:bg-[var(--midnight)] hover:text-[var(--cream)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sky)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--paper)]"
                    aria-label={`Coordinate a donation for ${item.title}`}
                  >
                    Coordinate
                    <ArrowUpRight aria-hidden="true" className="h-4 w-4" />
                  </Link>
                </article>
              )
            })}
          </div>
        </div>
      </section>

      <section className="bg-[var(--sky)]">
        <div className="mx-auto flex max-w-7xl flex-col gap-8 px-5 py-14 sm:px-8 lg:flex-row lg:items-end lg:justify-between lg:px-12 lg:py-20">
          <div>
            <p className="font-body text-xs font-bold uppercase tracking-[0.28em] text-[var(--midnight)]/70">Something else to donate?</p>
            <h2 className="mt-4 max-w-2xl font-display text-4xl leading-tight text-[var(--midnight)] sm:text-5xl">Tell us what you have in mind.</h2>
            <p className="mt-4 max-w-2xl font-body text-base leading-7 text-[var(--midnight)]/75">
              Share the item, its condition, and any accessories that come with it so we can coordinate the next step.
            </p>
          </div>
          <Link
            href="/contact?reason=wishlist"
            className="inline-flex min-h-11 items-center justify-center gap-2 bg-[var(--midnight)] px-5 py-3 font-body text-sm font-bold text-[var(--cream)] transition hover:bg-[var(--cobalt)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--midnight)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--sky)]"
          >
            Contact the team
            <ArrowUpRight aria-hidden="true" className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </main>
  )
}
