import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

const read = (relativePath: string) => readFileSync(join(process.cwd(), relativePath), 'utf8')

describe('safe public parity contracts', () => {
  it('keeps Team in both primary navigation surfaces with one Events action', () => {
    const navbar = read('src/components/Navbar.tsx')

    expect(navbar).toContain("{ label: 'Team', href: '/team' }")
    expect(navbar).toContain('primaryLinks.map')
    expect(navbar).toContain("const eventsLink = { label: 'Events', href: '/events' }")
    expect(navbar.match(/const eventsLink =/g) ?? []).toHaveLength(1)
  })

  it('restores the homepage program taxonomy, photos, and direct actions', () => {
    const home = read('src/app/page.tsx')
    const audienceRoutes = read('src/components/site/AudienceRoutes.tsx')

    for (const title of ['STEM Events', 'Tech education & mentorship', 'Community Access']) {
      expect(home).toContain(title)
    }
    for (const image of [
      '/images/events/science-odyssey/drive-02.webp',
      '/images/events/family-science-night/IMG_8332.JPG',
      '/images/events/wildcat-carnival/drive-05.webp',
    ]) {
      expect(home).toContain(image)
    }
    for (const href of ['href: \'/events\'', 'href: \'/team\'', 'href: \'/contact\'']) {
      expect(home).toContain(href)
    }
    expect(home).toContain('href="/volunteer"')
    expect(home).not.toContain('Apply to join the team')
    expect(home).toContain('<ProgramTaxonomy />')
    expect(audienceRoutes).toContain('const teamJoinUrl =')
    expect(audienceRoutes).toContain('secondaryAction: \'Team application\'')
    expect(audienceRoutes).toContain('target="_blank"')
  })

  it('keeps all current portraits and exposes archived profiles through disclosure', () => {
    const team = read('src/components/Team.tsx')

    for (const portrait of ['/robin.jpg', '/yashas.jpg', '/rahul.jpg', '/jaden.jpg', '/rohan.jpg', '/nolan.jpg', '/nikhil.jpg', '/arya.jpg']) {
      expect(team).toContain(`image: '${portrait}'`)
    }
    for (const fact of ['grade:', 'from:', 'school:', 'hobby:', 'favoriteApp:', 'major:']) {
      expect(team).toContain(fact)
    }
    expect(team).toContain('<details')
    expect(team).toContain('<summary')
    expect(team).toContain('aria-label={`View profile for ${member.name}`}')
    expect(team).toContain('grid-cols-1')
    expect(team).toContain('sm:grid-cols-2')
    expect(team).toContain('View profile')
    expect(team).toContain('Founder & President')
    expect(team).toContain('Graphics Design Lead')
    expect(team).toContain('efficient nonprofit work.')
  })

  it('keeps About vision evergreen and restores the four guiding values', () => {
    const about = read('src/components/About.tsx')

    expect(about).toContain('Our direction')
    expect(about).toContain('Our vision is a wider doorway.')
    for (const value of ['Accessibility', 'Innovation', 'Community', 'Excellence']) {
      expect(about).toContain(`title: '${value}'`)
    }
    expect(about).not.toMatch(/\b2026\b|1000\s*\+|100\s*\+/i)
  })

  it('keeps FAQ policy answers and both convenience actions', () => {
    const faq = read('src/app/faq/page.tsx')

    expect(faq).toContain('How much do your workshops cost?')
    expect(faq).toContain('We typically provide the materials and equipment needed for a workshop.')
    expect(faq).toContain('event-specific listing')
    expect(faq).toContain('volunteer orientation and event-specific guidance')
    expect(faq).toContain('href="/contact"')
    expect(faq).toContain('href="/wishlist"')
    expect(faq).not.toMatch(/100%|student-run non[- ]profit|501\s*\(\s*c\s*\)/i)
  })

  it('keeps a visible contact-form jump near the Contact introduction', () => {
    const contact = read('src/components/Contact.tsx')

    expect(contact).toContain('href="#contact-form"')
    expect(contact).toContain('Jump to the contact form')
    expect(contact).toContain('id="contact-form"')
  })
})
