import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'

const links = [
  { label: 'Wishlist', href: '/wishlist', description: 'Materials that make the next build possible.' },
  { label: 'Newsletter', href: '/newsletter', description: 'Occasional notes from the workshop.' },
  { label: 'FAQ', href: '/faq', description: 'Quick answers about the work and how to join.' },
]

export default function SupportLinks() {
  return (
    <section className="bg-cream" aria-labelledby="support-heading">
      <div className="site-shell mx-auto px-5 py-20 sm:px-8 lg:px-10 lg:py-24">
        <div className="flex flex-col gap-8 border-y border-ink/30 py-8 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="mb-3 font-display text-sm font-bold uppercase tracking-[0.18em] text-cobalt">Keep exploring</p>
            <h2 id="support-heading" className="display-heading text-4xl text-midnight sm:text-5xl">Stay close to the work.</h2>
          </div>
          <p className="body-copy text-base text-ink/70">A few useful next steps, whether you want to help, learn, or simply keep in touch.</p>
        </div>
        <div className="grid border-b border-ink/30 sm:grid-cols-3">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className="group border-b border-ink/30 py-7 sm:border-b-0 sm:border-r sm:px-6 sm:first:pl-0 sm:last:border-r-0 lg:px-8">
              <span className="font-display text-xl font-semibold text-midnight group-hover:text-cobalt">{link.label}</span>
              <span className="mt-2 block max-w-xs text-sm leading-6 text-ink/65">{link.description}</span>
              <span className="mt-5 flex items-center text-sm font-bold text-cobalt" aria-hidden="true">Open <ArrowUpRight className="ml-2 h-4 w-4" /></span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
