import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const read = (relativePath: string) => readFileSync(join(process.cwd(), relativePath), 'utf8')

const pageSources = {
  about: read('src/components/About.tsx'),
  team: read('src/components/Team.tsx'),
  contact: read('src/components/Contact.tsx'),
  faq: read('src/app/faq/page.tsx'),
  fundraiser: read('src/app/fundraiser/page.tsx'),
  wishlist: read('src/app/wishlist/page.tsx'),
  newsletter: read('src/app/newsletter/page.tsx'),
}

describe('informational and action pages', () => {
  it('keeps verified finance and donation fallbacks visible', () => {
    const financeUrl = 'https://hcb.hackclub.com/pillars-of-tech/transactions'
    const donationUrl = 'https://hcb.hackclub.com/donations/start/pillars-of-tech'

    expect(pageSources.about).toContain('Fiscally sponsored through Hack Club')
    expect(pageSources.about).toContain(financeUrl)
    expect(pageSources.about).not.toContain('/transparency')
    expect(pageSources.fundraiser).toContain(donationUrl)
    expect(pageSources.fundraiser).toContain('Hack Club handles checkout')
    expect(pageSources.fundraiser).toContain('does not receive your card details')
    expect(pageSources.fundraiser).toContain('href={donationUrl}')
    expect(pageSources.fundraiser).toContain('<ExternalEmbedOptIn')
    expect(pageSources.fundraiser).not.toContain('<iframe')
  })

  it('preserves the contact endpoint, inquiry choices, honeypot, and states', () => {
    const contact = pageSources.contact
    expect(contact).toContain("fetch('/api/contact'")
    expect(contact).toContain('honeypot,')
    expect(contact).toContain('setHoneypot(event.target.value)')
    expect(contact).toContain('subjectOptions')
    expect(contact).toContain("'sending'")
    expect(contact).toContain("'success'")
    expect(contact).toContain("'error'")
    expect(contact).toContain('mailto:${CONTACT_EMAIL}')
    expect(contact).toContain('aria-live="polite"')
    expect(contact).toContain('subjectOptions.some((option) => option.value === reason)')
  })

  it('uses native FAQ disclosure controls and keeps a contact route', () => {
    expect(pageSources.faq).toContain('<details')
    expect(pageSources.faq).toContain('<summary')
    expect(pageSources.faq).toContain('href="/contact"')
    expect(pageSources.faq).toContain('For students')
    expect(pageSources.faq).toContain('For families')
    expect(pageSources.faq).toContain('For volunteers')
  })

  it('keeps the real team portraits and join actions', () => {
    for (const image of ['/robin.jpg', '/yashas.jpg', '/rahul.jpg', '/jaden.jpg', '/rohan.jpg', '/nolan.jpg', '/nikhil.jpg', '/arya.jpg']) {
      expect(pageSources.team).toContain(`image: '${image}'`)
    }
    expect(pageSources.team).toContain('https://forms.gle/XqeKkMF4cj5W62yL9')
    expect(pageSources.team).toContain('href="/volunteer"')
    expect(pageSources.about).toContain('href="/team"')
    expect(pageSources.team).not.toContain('placeholder')
  })

  it('keeps wishlist and newsletter destinations tied to the existing content', () => {
    for (const item of ['Microcontrollers', 'Laptops and Chromebooks', 'Robotics Components', 'Soldering Supplies']) {
      expect(pageSources.wishlist).toContain(item)
    }
    expect(pageSources.wishlist).toContain('href="/contact?reason=wishlist"')
    expect(pageSources.wishlist).not.toContain('student-run nonprofit')

    const newsletterData = read('src/data/newsletter.ts')
    for (const destination of ['newsletterSignupUrl', 'newsletterEmbedUrl', 'newsletterWebsiteUrl']) {
      expect(pageSources.newsletter).toContain(destination)
      expect(newsletterData).toContain(destination)
    }
    expect(newsletterData).toContain('https://forms.gle/skeQAnZehhyVUV5k9')
    expect(newsletterData).toContain('Every Sunday')
    expect(pageSources.newsletter).not.toMatch(/testimonial|what readers say/i)
    expect(pageSources.newsletter).toContain('<ExternalEmbedOptIn')
    expect(pageSources.newsletter).not.toContain('<iframe')
  })

  it('does not ship retired legal, metric, partner, or SLA claims', () => {
    const publicCopy = Object.values(pageSources).join('\n')
    for (const retiredClaim of [
      /1000\s*\+/i,
      /100\s*\+/i,
      /students reached/i,
      /volunteer hours/i,
      /partner organizations/i,
      /our partners/i,
      /\b2026\b/i,
      /501\s*\(\s*c\s*\)\s*\(\s*3\s*\)/i,
      /tax[- ]deductible/i,
      /no overhead/i,
      /every donation/i,
      /all donations? (?:go|are) directly/i,
      /within 24 hours/i,
      /student[- ]run nonprofit/i,
      /underserved communities/i,
      /underrepresented communities.*succeed/i,
    ]) {
      expect(publicCopy).not.toMatch(retiredClaim)
    }
  })
})
