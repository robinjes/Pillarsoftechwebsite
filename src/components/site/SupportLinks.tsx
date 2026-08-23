import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'

const links = [
  { label: 'Wishlist', href: '/wishlist', description: 'Materials for the next build.' },
  { label: 'Newsletter', href: '/newsletter', description: 'Weekly notes from the workshop.' },
  { label: 'FAQ', href: '/faq', description: 'Answers about the work and how to join.' },
]

export default function SupportLinks() {
  return (
    <section className="bg-cream" aria-labelledby="support-heading">
      <div className="site-shell mx-auto px-5 py-20 sm:px-8 lg:px-10 lg:py-24">
        <div className="flex flex-col gap-4 border-y border-ink/30 py-8 sm:flex-row sm:items-end sm:justify-between">
          <h2 id="support-heading" className="display-heading text-4xl text-midnight sm:text-5xl">Stay close to the work.</h2>
          <p className="max-w-sm text-base leading-7 text-ink/70">Useful next steps for helping, learning, or keeping in touch.</p>
        </div>
        <nav aria-label="More ways to stay involved" className="grid divide-y divide-ink/30 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className="group flex min-h-32 flex-col justify-between py-6 sm:px-6 sm:first:pl-0 sm:last:pr-0">
              <span>
                <span className="font-display text-2xl font-semibold text-midnight group-hover:text-cobalt">{link.label}</span>
                <span className="mt-2 block max-w-xs text-sm leading-6 text-ink/65">{link.description}</span>
              </span>
              <span className="mt-5 flex items-center text-sm font-bold text-cobalt" aria-hidden="true">Open <ArrowUpRight className="ml-2 h-4 w-4" /></span>
            </Link>
          ))}
        </nav>
      </div>
    </section>
  )
}
