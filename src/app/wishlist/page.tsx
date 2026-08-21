import Image from 'next/image'
import Link from 'next/link'
import { ArrowUpRight, Boxes, CircuitBoard, Cpu, Printer, Radio, Wrench } from 'lucide-react'
import SignalPageIntro from '@/components/site/SignalPageIntro'

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
    <main className="min-h-screen overflow-x-hidden bg-[var(--bone)] text-[var(--carbon)]">
      <SignalPageIntro
        eyebrow="PARTS MANIFEST / 01"
        title="Pack the next build."
        description="A useful donation is a student getting one step closer to a working prototype. Browse the current manifest, then send the team a note about what you can bring."
        image={{
          src: '/images/events/family-science-night/IMG_5880.jpg',
          alt: 'A young participant holds a controller beside a VEX robot.',
        }}
        tone="bone"
        imagePosition="center"
        actions={(
          <>
            <Link href="/contact?reason=wishlist" className="signal-button signal-button--orange">
              Coordinate a donation
              <ArrowUpRight aria-hidden="true" className="h-4 w-4" />
            </Link>
            <Link href="/faq" className="signal-button signal-button--line">Read the FAQ</Link>
          </>
        )}
      />

      <section className="border-b border-[var(--carbon)]/25 bg-[var(--off-white)]" aria-labelledby="manifest-title">
        <div className="signal-shell py-16 sm:py-20 lg:py-28">
          <div className="grid gap-8 border-b border-[var(--carbon)]/30 pb-8 lg:grid-cols-[0.7fr_1.3fr] lg:items-end lg:gap-16">
            <div>
              <p className="signal-mono text-[var(--signal-orange)]">MANIFEST / 02 · CURRENT NEEDS</p>
              <h2 id="manifest-title" className="mt-4 max-w-md font-display text-4xl font-semibold leading-[0.92] tracking-[-0.055em] text-[var(--carbon)] sm:text-5xl">Choose one useful piece.</h2>
            </div>
            <p className="max-w-xl font-body text-base leading-7 text-[var(--carbon)]/68">The list is intentionally practical: small parts, reliable tools, and the quiet infrastructure that lets a workshop keep moving. Have something else? Use the same contact route to check fit and condition.</p>
          </div>

          <div className="mt-8 divide-y divide-[var(--carbon)]/25 border-y border-[var(--carbon)]/25">
            {wishlistItems.map((item, index) => {
              const Icon = item.icon

              return (
                <article key={item.title} className="grid gap-5 py-7 sm:grid-cols-[4rem_0.8fr_1.2fr_auto] sm:items-center sm:gap-7">
                  <div className="flex items-center gap-3 sm:block">
                    <span className="signal-mono text-[var(--signal-orange)]">0{index + 1}</span>
                    <div className="flex h-11 w-11 items-center justify-center border border-[var(--carbon)]/35 bg-[var(--bone)] text-[var(--ultramarine)] sm:mt-3">
                      <Icon aria-hidden="true" className="h-5 w-5" strokeWidth={1.7} />
                    </div>
                  </div>
                  <div>
                    <p className="signal-mono text-[var(--ultramarine)]">{item.useCase}</p>
                    <h3 className="mt-2 font-display text-2xl font-semibold leading-[0.95] tracking-[-0.04em] text-[var(--carbon)]">{item.title}</h3>
                  </div>
                  <p className="max-w-xl font-body text-base leading-7 text-[var(--carbon)]/68">{item.description}</p>
                  <Link
                    href="/contact?reason=wishlist"
                    className="signal-button signal-button--line justify-self-start sm:justify-self-end"
                    aria-label={`Coordinate a donation for ${item.title}`}
                  >
                    Coordinate
                    <ArrowUpRight aria-hidden="true" className="h-4 w-4" />
                  </Link>
                </article>
              )
            })}
          </div>

          <figure className="relative mt-10 aspect-[16/5] overflow-hidden border border-[var(--carbon)]/35 bg-[var(--mist)]">
            <Image
              src="/images/events/family-science-night/IMG_5905.jpg"
              alt="A close view of student-built robotics equipment at Family Science Night."
              fill
              sizes="(min-width: 1024px) 90vw, 100vw"
              className="object-cover object-center"
            />
            <figcaption className="absolute inset-x-0 bottom-0 bg-[var(--carbon)]/85 px-4 py-3 signal-mono text-[var(--off-white)]">FIELD NOTE / PARTS BECOME POSSIBLE IN CONTEXT</figcaption>
          </figure>
        </div>
      </section>

      <section className="bg-[var(--signal-orange)] text-[var(--carbon)]" aria-labelledby="other-donation-title">
        <div className="signal-shell grid gap-8 py-14 sm:py-[4.5rem] lg:grid-cols-[1fr_auto] lg:items-end lg:py-20">
          <div>
            <p className="signal-mono">OPEN SLOT / 03</p>
            <h2 id="other-donation-title" className="mt-3 max-w-2xl font-display text-4xl font-semibold leading-[0.93] tracking-[-0.05em] sm:text-5xl">Have another useful piece?</h2>
            <p className="mt-4 max-w-2xl font-body text-base leading-7 text-[var(--carbon)]/75">Tell us what you have, its condition, and any accessories that come with it. We will help route the idea to the right person.</p>
          </div>
          <Link href="/contact?reason=wishlist" className="signal-button border-[var(--carbon)] bg-[var(--carbon)] text-[var(--off-white)] hover:bg-[var(--ultramarine)] hover:text-[var(--off-white)]">
            Contact the team
            <ArrowUpRight aria-hidden="true" className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </main>
  )
}
