import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'

const links = [
  { label: 'Wishlist', href: '/wishlist', description: 'Materials for the next build.' },
  { label: 'Newsletter', href: '/newsletter', description: 'Sunday notes from the workshop.' },
  { label: 'FAQ', href: '/faq', description: 'Answers before you arrive.' },
]

export default function SupportLinks() {
  return (
    <section className="signal-utility" aria-labelledby="support-heading">
      <div className="signal-shell">
        <div className="signal-utility__intro">
          <p className="signal-mono signal-eyebrow">KEEP THE LINE OPEN / 06</p>
          <h2 id="support-heading">Stay close to the work.</h2>
        </div>
        <nav aria-label="More ways to stay involved" className="signal-utility__links">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className="signal-utility__link">
              <span><strong>{link.label}</strong><small>{link.description}</small></span>
              <ArrowUpRight aria-hidden="true" />
            </Link>
          ))}
        </nav>
      </div>
    </section>
  )
}
