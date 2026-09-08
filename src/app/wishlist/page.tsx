import Image from 'next/image'
import Link from 'next/link'
import type { Metadata } from 'next'
import { ArrowUpRight, Boxes, CircuitBoard, Cpu, Printer, Radio, Wrench } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Workshop Wishlist | Pillars of Tech',
  description: 'See the equipment and supplies that help Pillars of Tech run hands-on STEM workshops.',
}

const wishlistItems = [
  {
    title: 'Microcontrollers',
    icon: Cpu,
    description: 'Boards like Arduino and micro:bit support lessons in programming, sensors, and electronics through hands-on builds.',
    useCase: 'Workshop starter kits',
    purpose: 'Build and code',
  },
  {
    title: 'Laptops and Chromebooks',
    icon: CircuitBoard,
    description: 'Reliable laptops help students code, research, and run workshop software during a session.',
    useCase: 'Student coding stations',
    purpose: 'Build and code',
  },
  {
    title: 'Robotics Components',
    icon: CircuitBoard,
    description: 'Motors, wheels, servos, and sensor packs make robot demonstrations tangible and changeable.',
    useCase: 'Robot prototypes',
    purpose: 'Robotics and electronics',
  },
  {
    title: 'Chargers and Power Strips',
    icon: Wrench,
    description: 'Extra chargers, USB-C cables, and power strips keep devices ready during workshop days.',
    useCase: 'Device support',
    purpose: 'Workshop operations',
  },
  {
    title: '3D Printer Materials',
    icon: Printer,
    description: 'Filament, nozzles, and upkeep parts support custom mounts, cases, and printable workshop parts.',
    useCase: 'Printable hardware',
    purpose: 'Workshop operations',
  },
  {
    title: 'Soldering Supplies',
    icon: Wrench,
    description: 'Solder, wire, and replacement tips support repair lessons and durable electronics projects.',
    useCase: 'Repair and build labs',
    purpose: 'Robotics and electronics',
  },
  {
    title: 'Sensors and Input Modules',
    icon: Radio,
    description: 'Distance, temperature, light, and motion sensors power experiments that connect STEM concepts to data.',
    useCase: 'Interactive demos',
    purpose: 'Robotics and electronics',
  },
  {
    title: 'Storage and Organizers',
    icon: Boxes,
    description: 'Bins, cases, and labeled organizers keep small parts sorted for mobile workshop kits.',
    useCase: 'Portable workshop kits',
    purpose: 'Workshop operations',
  },
  {
    title: 'Tablets and Input Devices',
    icon: Radio,
    description: 'Tablets, mice, and keyboards support flexible stations for younger learners and accessible activities.',
    useCase: 'Flexible learning stations',
    purpose: 'Robotics and electronics',
  },
] as const

const wishlistGroups = ['Build and code', 'Robotics and electronics', 'Workshop operations'].map((purpose) => ({
  purpose,
  items: wishlistItems.filter((item) => item.purpose === purpose),
}))

export default function WishlistPage() {
  return (
    <main className="min-h-screen overflow-x-hidden bg-[var(--cream)] text-[var(--ink)]">
      <header className="border-b border-[var(--ink)]/20">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 py-8 sm:px-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:px-12 lg:py-12">
          <div>
            <p className="font-body text-sm font-semibold text-[var(--cobalt)]">Workshop packing list</p>
            <h1 className="mt-4 max-w-xl font-display text-5xl leading-[0.98] text-[var(--midnight)] sm:text-[4.35rem]">Pack the next build.</h1>
            <p className="mt-6 max-w-lg font-body text-base leading-7 text-[var(--ink)]/70 sm:text-lg">
              These are the practical tools that turn an open table into a hands-on STEM session. Every item has a useful next step.
            </p>
            <div className="mt-7 flex flex-wrap gap-4">
              <Link
                href="/contact?reason=wishlist"
                className="inline-flex min-h-11 items-center gap-2 rounded-full border-2 border-[var(--midnight)] bg-[var(--midnight)] px-5 py-3 font-body text-sm font-bold text-[var(--cream)] transition hover:bg-[var(--cobalt)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sky)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--cream)]"
              >
                Coordinate A Donation
                <ArrowUpRight aria-hidden="true" className="h-4 w-4" />
              </Link>
              <Link
                href="/faq"
                className="inline-flex min-h-11 items-center rounded-full border-2 border-[var(--midnight)] px-5 py-3 font-body text-sm font-bold text-[var(--midnight)] transition hover:bg-[var(--paper)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sky)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--cream)]"
              >
                Read The FAQ
              </Link>
            </div>
          </div>

          <figure className="relative min-h-[19rem] overflow-hidden rounded-[2rem] border border-[var(--ink)]/25 bg-[var(--midnight)] sm:min-h-[27rem]">
            <Image
              src="/images/events/family-science-night/IMG_5880.jpg"
              alt="A young participant holds a controller beside a VEX robot."
              fill
              priority
              sizes="(min-width: 1024px) 55vw, 100vw"
              className="object-cover object-center"
            />
          </figure>
        </div>
      </header>

      <section className="border-b border-[var(--ink)]/20 bg-[var(--paper)]">
        <div className="mx-auto max-w-7xl px-5 py-10 sm:px-8 lg:px-12 lg:py-14">
          <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="font-body text-sm font-semibold text-[var(--cobalt)]">What would help next</p>
              <h2 className="mt-2 font-display text-4xl leading-tight text-[var(--midnight)] sm:text-5xl">Choose one useful piece.</h2>
            </div>
            <p className="max-w-sm font-body text-sm leading-6 text-[var(--ink)]/65">
              Have another item in mind? Use the same contact route to check fit, condition, and delivery.
            </p>
          </div>

          <div className="space-y-8">
            {wishlistGroups.map((group) => (
              <section key={group.purpose} className="border-t border-[var(--ink)]/20 pt-6" aria-labelledby={`wishlist-${group.purpose.toLowerCase().replaceAll(' ', '-')}`}>
                <div className="mb-2 flex items-baseline justify-between gap-4">
                  <h3 id={`wishlist-${group.purpose.toLowerCase().replaceAll(' ', '-')}`} className="font-display text-2xl text-[var(--midnight)]">{group.purpose}</h3>
                  <span className="text-sm font-semibold text-[var(--ink)]/55">{group.items.length} {group.items.length === 1 ? 'item' : 'items'}</span>
                </div>
                <div className="divide-y divide-[var(--ink)]/20">
                  {group.items.map((item) => {
                    const Icon = item.icon

                    return (
                      <article key={item.title} className="grid gap-5 py-7 sm:grid-cols-[3.5rem_0.8fr_1.2fr_auto] sm:items-center sm:gap-7">
                        <div className="flex h-12 w-12 items-center justify-center rounded-[1rem] border border-[var(--ink)]/25 bg-[var(--cream)] text-[var(--cobalt)]">
                          <Icon aria-hidden="true" className="h-6 w-6" strokeWidth={1.7} />
                        </div>
                        <div>
                          <p className="font-body text-xs font-semibold text-[var(--cobalt)]">{item.useCase}</p>
                          <h4 className="mt-1 font-display text-2xl leading-tight text-[var(--midnight)]">{item.title}</h4>
                        </div>
                        <p className="font-body text-base leading-7 text-[var(--ink)]/70">{item.description}</p>
                        <Link
                          href="/contact?reason=wishlist"
                          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border-2 border-[var(--midnight)] px-4 py-3 font-body text-sm font-bold text-[var(--midnight)] transition hover:bg-[var(--midnight)] hover:text-[var(--cream)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sky)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--paper)]"
                          aria-label={`Coordinate a donation for ${item.title}`}
                        >
                          Coordinate
                          <ArrowUpRight aria-hidden="true" className="h-4 w-4" />
                        </Link>
                      </article>
                    )
                  })}
                </div>
              </section>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[var(--sky)]">
        <div className="mx-auto flex max-w-7xl flex-col gap-8 px-5 py-10 sm:px-8 lg:flex-row lg:items-end lg:justify-between lg:px-12 lg:py-14">
          <div>
            <p className="font-body text-sm font-semibold text-[var(--midnight)]/70">Something else to donate?</p>
            <h2 className="mt-3 max-w-2xl font-display text-4xl leading-tight text-[var(--midnight)] sm:text-5xl">Tell us what you have in mind.</h2>
            <p className="mt-4 max-w-2xl font-body text-base leading-7 text-[var(--midnight)]/75">
              Share the item, its condition, and any accessories that come with it so we can coordinate the next step.
            </p>
          </div>
          <Link
            href="/contact?reason=wishlist"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border-2 border-[var(--midnight)] bg-[var(--midnight)] px-5 py-3 font-body text-sm font-bold text-[var(--cream)] transition hover:bg-[var(--cobalt)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--midnight)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--sky)]"
          >
            Contact The Team
            <ArrowUpRight aria-hidden="true" className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </main>
  )
}
