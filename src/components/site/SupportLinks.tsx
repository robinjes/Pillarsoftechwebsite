import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'

const links = [
  { label: 'Wishlist', href: '/wishlist', description: 'Materials for the next build.' },
  { label: 'Newsletter', href: '/newsletter', description: 'Notes from the workshop and what is coming next.' },
  { label: 'FAQ', href: '/faq', description: 'Answers about the work and how to join.' },
  { label: 'Contact', href: '/contact', description: 'Bring a question, idea, or workshop invitation.' },
]

export default function SupportLinks() {
  return (
    <section className="bg-cream" aria-labelledby="support-heading">
      <div className="site-shell mx-auto px-5 py-20 sm:px-8 lg:px-10 lg:py-24">
        <div className="grid gap-8 border-y border-ink/30 py-8 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-16">
          <div>
            <p className="eyebrow text-cobalt">Keep in touch</p>
            <h2 id="support-heading" className="display-heading mt-4 text-4xl text-midnight sm:text-5xl">Stay close to the work.</h2>
            <p className="mt-4 max-w-sm text-base leading-7 text-ink/70">Useful next steps for helping, learning, or keeping in touch.</p>
          </div>

          <nav aria-label="More ways to stay involved" className="support-links__list">
            {links.map((link) => (
              <Link key={link.href} href={link.href} className="support-link group flex min-h-20 items-center justify-between gap-6 border-b border-ink/25 py-4">
                <span>
                  <span className="block font-display text-2xl font-semibold tracking-[-0.03em] text-midnight group-hover:text-cobalt">{link.label}</span>
                  <span className="mt-1 block text-sm leading-6 text-ink/65">{link.description}</span>
                </span>
                <ArrowUpRight className="h-5 w-5 shrink-0 text-cobalt transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden="true" />
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </section>
  )
}
