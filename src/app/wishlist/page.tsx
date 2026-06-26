import Link from 'next/link'
import { Fredoka } from 'next/font/google'
import { Cpu, Printer, Radio, CircuitBoard, Wrench, Boxes } from 'lucide-react'

const fredoka = Fredoka({ subsets: ['latin'] })

const wishlistItems = [
  {
    title: 'Microcontrollers',
    icon: Cpu,
    description:
      'Boards like Arduino and micro:bit help students learn basic programming, sensors, and electronics through hands-on builds.',
    useCase: 'Workshop starter kits'
  },
  {
    title: 'Laptops and Chromebooks',
    icon: CircuitBoard,
    description:
      'Reliable laptops help students code, research, and run workshop software without worrying about device availability.',
    useCase: 'Student coding stations'
  },
  {
    title: 'Robotics Components',
    icon: CircuitBoard,
    description:
      'Motors, wheels, servos, and sensor packs let us build robot demos that make coding feel tangible and exciting.',
    useCase: 'Robot prototypes'
  },
  {
    title: 'Chargers and Power Strips',
    icon: Wrench,
    description:
      'Extra chargers, USB-C cables, and power strips keep devices ready during long workshops and packed event days.',
    useCase: 'Device support'
  },
  {
    title: '3D Printer Materials',
    icon: Printer,
    description:
      'Filament, nozzles, and upkeep parts help us create custom mounts, cases, and printable workshop parts on demand.',
    useCase: 'Printable hardware'
  },
  {
    title: 'Soldering Supplies',
    icon: Wrench,
    description:
      'Solder, wire, and replacement tips keep repair lessons safe and let students assemble durable electronics projects.',
    useCase: 'Repair and build labs'
  },
  {
    title: 'Sensors and Input Modules',
    icon: Radio,
    description:
      'Distance, temperature, light, and motion sensors power interactive experiments that connect STEM concepts to real data.',
    useCase: 'Interactive demos'
  },
  {
    title: 'Storage and Organizers',
    icon: Boxes,
    description:
      'Bins, cases, and labeled organizers keep small parts sorted so mobile workshop kits stay reliable and easy to deploy.',
    useCase: 'Portable workshop kits'
  },
  {
    title: 'Tablets and Input Devices',
    icon: Radio,
    description:
      'Tablets, mice, and keyboards help us create flexible stations for younger learners and accessible hands-on activities.',
    useCase: 'Flexible learning stations'
  }
] as const

export default function WishlistPage() {
  return (
    <main className="min-h-screen pt-16">
      <section className="relative overflow-hidden border-b border-white/10 bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.16),transparent_24%),linear-gradient(180deg,#091737_0%,#11265e_100%)]">
        <div className="absolute inset-0 bg-[linear-gradient(135deg,transparent_10%,rgba(255,255,255,0.06)_50%,transparent_90%)] opacity-70" />
        <div className="absolute -left-24 top-12 h-72 w-72 rounded-full bg-cyan-400/20 blur-3xl" />
        <div className="absolute -right-28 top-4 h-80 w-80 rounded-full bg-blue-500/20 blur-3xl" />

        <div className="relative mx-auto grid max-w-7xl gap-8 px-4 py-16 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:px-8 lg:py-24">
          <div className="max-w-3xl">
            <div className="inline-flex min-h-11 items-center rounded-full border border-cyan-300/30 bg-cyan-400/10 px-4 py-2 text-sm font-semibold text-cyan-100">
              Hardware Wishlist
            </div>

            <h1 className={`${fredoka.className} mt-6 text-4xl font-bold tracking-tight text-white sm:text-6xl`}>
              Help us scale more workshops with the right gear.
            </h1>

            <p className="mt-5 max-w-2xl text-base leading-7 text-blue-100 sm:text-xl sm:leading-8">
              These are the items that help our student-run nonprofit run hands-on STEM sessions with
              better consistency, more devices, and less setup time.
            </p>

            <p className="mt-4 max-w-2xl text-sm leading-6 text-blue-100">
              Have something else you think could help? We welcome surprise donations too. If it is not on
              the list, send us a message and we will let you know whether we can use it.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/contact?reason=wishlist"
                className="inline-flex min-h-11 items-center justify-center rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-900 transition hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/80 focus-visible:ring-offset-2 focus-visible:ring-offset-[#091737]"
              >
                Coordinate a Hardware Donation
              </Link>
              <Link
                href="/faq"
                className="inline-flex min-h-11 items-center justify-center rounded-full border border-white/15 bg-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/80 focus-visible:ring-offset-2 focus-visible:ring-offset-[#091737]"
              >
                Read the FAQ
              </Link>
            </div>
          </div>

          <aside className="rounded-[2rem] border border-white/10 bg-white/5 p-6 backdrop-blur-sm sm:p-8">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-200">
              Donation focus
            </p>
            <div className="mt-4 space-y-3 text-sm leading-6 text-blue-50">
              <p>• Portable classroom kits for workshops</p>
              <p>• Reliable electronics for hands-on demonstrations</p>
              <p>• Storage and maintenance supplies to keep everything organized</p>
            </div>
            <div className="mt-6 rounded-2xl border border-cyan-300/15 bg-cyan-400/10 p-5">
              <p className="text-sm font-semibold text-cyan-100">Need a faster way to help?</p>
              <p className="mt-2 text-sm leading-6 text-blue-100">
                Use the contact form and select the wishlist option so we can coordinate the next step with
                you.
              </p>
            </div>
          </aside>
        </div>
      </section>

      <section className="bg-[linear-gradient(180deg,rgba(17,38,94,0.95)_0%,rgba(8,15,36,0.98)_100%)] py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="sr-only">Wishlist items and donation options</h2>
          <div className="mb-8 max-w-2xl">
            <h3 className={`${fredoka.className} text-3xl font-bold text-white sm:text-4xl`}>
              Items that move our workshops forward
            </h3>
            <p className="mt-3 text-sm leading-7 text-blue-100 sm:text-base">
              Each card includes a placeholder image area so the layout stays clear even before we add
              product photography.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {wishlistItems.map((item) => {
              const Icon = item.icon

              return (
                <article
                  key={item.title}
                  className="flex h-full flex-col overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950/20 shadow-[0_30px_100px_-40px_rgba(14,165,233,0.45)]"
                >
                  <div
                    role="img"
                    aria-label={`${item.title} image placeholder`}
                    className="relative flex min-h-48 items-center justify-center bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.22),transparent_42%),linear-gradient(135deg,rgba(15,23,42,0.98),rgba(30,64,175,0.75))] p-6"
                  >
                    <div className="absolute inset-0 bg-[linear-gradient(135deg,transparent_0%,rgba(255,255,255,0.08)_45%,transparent_100%)] opacity-60" />
                    <div className="relative flex h-20 w-20 items-center justify-center rounded-3xl border border-white/15 bg-white/10 text-cyan-100">
                      <Icon className="h-9 w-9" />
                    </div>
                  </div>

                  <div className="flex flex-1 flex-col p-6">
                    <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-200">
                      {item.useCase}
                    </p>
                    <h4 className="mt-3 text-2xl font-bold text-white">{item.title}</h4>
                    <p className="mt-3 text-sm leading-7 text-blue-100">{item.description}</p>

                    <div className="mt-6">
                      <Link
                        href="/contact?reason=wishlist"
                        className="inline-flex min-h-11 w-full items-center justify-center rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-900 transition hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/80 focus-visible:ring-offset-2 focus-visible:ring-offset-[#091737]"
                        aria-label={`Coordinate a hardware donation for ${item.title}`}
                      >
                        Coordinate a Hardware Donation
                      </Link>
                    </div>
                  </div>
                </article>
              )
            })}
          </div>

          <div className="mt-10 rounded-[2rem] border border-cyan-300/15 bg-cyan-400/10 p-6 sm:p-8">
            <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-200">
                  Ready to help?
                </p>
                <p className="mt-2 max-w-2xl text-sm leading-7 text-blue-100 sm:text-base">
                  Use the contact form and we will coordinate logistics, timing, and any questions about
                  what would help most.
                </p>
              </div>

              <Link
                href="/contact?reason=wishlist"
                className="inline-flex min-h-11 items-center justify-center rounded-full bg-white px-6 py-3 text-sm font-semibold text-slate-900 transition hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/80 focus-visible:ring-offset-2 focus-visible:ring-offset-[#091737]"
              >
                Coordinate a Hardware Donation
              </Link>
            </div>
          </div>

          <div className="mt-6 rounded-[2rem] border border-white/10 bg-white/5 p-6 sm:p-8">
            <div className="grid gap-6 md:grid-cols-[1.1fr_0.9fr] md:items-center">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-200">
                  Something else to donate?
                </p>
                <h3 className={`${fredoka.className} mt-3 text-2xl font-bold text-white sm:text-3xl`}>
                  We still want to hear about it.
                </h3>
                <p className="mt-3 text-sm leading-7 text-blue-100 sm:text-base">
                  If you have equipment, accessories, or supplies that are not listed here, reach out
                  anyway. Items like spare mice, adapters, headphones, USB cables, tool kits, or classroom
                  storage can still make a big difference.
                </p>
              </div>

              <div className="rounded-2xl border border-cyan-300/15 bg-cyan-400/10 p-5">
                <p className="text-sm font-semibold text-cyan-100">What to include</p>
                <ul className="mt-3 space-y-2 text-sm leading-6 text-blue-50">
                  <li>• What the item is</li>
                  <li>• Approximate condition or quantity</li>
                  <li>• Whether it includes chargers, cables, or accessories</li>
                </ul>
                <Link
                  href="/contact?reason=wishlist"
                  className="mt-5 inline-flex min-h-11 w-full items-center justify-center rounded-full bg-white px-6 py-3 text-sm font-semibold text-slate-900 transition hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/80 focus-visible:ring-offset-2 focus-visible:ring-offset-[#091737]"
                >
                  Tell us about another donation
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
