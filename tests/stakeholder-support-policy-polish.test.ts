import { readFileSync } from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

const projectRoot = path.resolve(process.cwd())
const read = (relativePath: string) => readFileSync(path.join(projectRoot, relativePath), 'utf8')

const fundraiser = read('src/app/fundraiser/page.tsx')
const wishlist = read('src/app/wishlist/page.tsx')
const faq = read('src/app/faq/page.tsx')
const privacy = read('src/app/privacy/page.tsx')
const accessibility = read('src/app/accessibility/page.tsx')

describe('stakeholder support and policy polish', () => {
  it('keeps fundraiser support direct, secure, and opt-in', () => {
    expect(fundraiser).not.toContain('Support Pillars of Tech')
    expect(fundraiser).not.toContain('A direct route to the work')
    expect(fundraiser).toContain('https://hcb.hackclub.com/donations/start/pillars-of-tech')
    expect(fundraiser).toContain('https://hcb.hackclub.com/pillars-of-tech/transactions')
    expect(fundraiser).toContain('<ExternalEmbedOptIn')
    expect(fundraiser).toContain('absolute left-5 top-5 z-10')
    expect(fundraiser).toContain('min-h-11')
    expect(fundraiser).toContain('rounded-full')
    expect(fundraiser).toContain('border-2 border-[var(--cream)]')
    expect(fundraiser).toContain('Open Secure Donation Page')
    expect(fundraiser).toContain('View Transparent Finances')
    expect(fundraiser).toContain('Load Secure Checkout')
  })

  it('keeps wishlist routes and item dividers without decorative captions', () => {
    expect(wishlist).not.toContain('<figcaption')
    expect(wishlist).not.toContain('border-b border-[var(--ink)]/30 pb-6 sm:flex-row')
    expect(wishlist).not.toContain('space-y-10 border-y')
    expect(wishlist).toContain('space-y-8')
    expect(wishlist).toContain('border-t border-[var(--ink)]/20 pt-6')
    expect(wishlist).toContain('divide-y divide-[var(--ink)]/20')
    expect(wishlist).toContain('href="/contact?reason=wishlist"')
    for (const item of ['Microcontrollers', 'Laptops and Chromebooks', 'Robotics Components', 'Chargers and Power Strips', '3D Printer Materials', 'Soldering Supplies', 'Sensors and Input Modules', 'Storage and Organizers', 'Tablets and Input Devices']) {
      expect(wishlist).toContain(item)
    }
    expect(wishlist).toContain('Coordinate A Donation')
    expect(wishlist).toContain('Read The FAQ')
    expect(wishlist).toContain('Contact The Team')
  })

  it('makes the FAQ final callout distinct from the navy footer', () => {
    expect(faq).toContain('className="bg-[var(--sky)] text-[var(--midnight)]"')
    expect(faq).toContain('rounded-full border-2 border-[var(--midnight)]')
    expect(faq).toContain('Contact The Team')
  })

  it('uses compact shared policy structure and states deferred chat boundaries', () => {
    for (const source of [privacy, accessibility]) {
      expect(source).toContain('policy-page')
      expect(source).toContain('policy-hero')
      expect(source).toContain('policy-section')
      expect(source).toContain('policy-actions')
      expect(source).toMatch(/contact form is currently available/i)
      expect(source).toMatch(/public live chat and the Discord reply bridge are not enabled yet/i)
      expect(source).toMatch(/direct email/i)
      expect(source).toMatch(/known limitations/i)
      expect(source).toMatch(/passwords|home addresses|school schedules|medical information|emergency requests/i)
      expect(source).toMatch(/keyboard|focus/i)
      expect(source).toMatch(/reduced motion/i)
      expect(source).not.toMatch(/visitor live-chat widget is (?:active|enabled|deployed)/i)
      expect(source).not.toMatch(/Discord (?:staff )?bridge is (?:active|enabled|deployed)/i)
      expect(source).not.toMatch(/office-hours queue is (?:active|enabled|open)/i)
      expect(source).not.toMatch(/(?:active|operational) 30-day chat-retention job/i)
    }
    expect(privacy).toMatch(/HttpOnly|SameSite=Lax|Secure/i)
    expect(privacy).toContain('30 days')
    expect(privacy).toContain('href="/contact"')
    expect(accessibility).toContain('href="/contact"')

    const stakeholderSources = [
      read('src/components/site/EventProof.tsx'),
      read('src/components/site/NextEventSection.tsx'),
      read('src/components/About.tsx'),
      read('src/app/events/page.tsx'),
      read('src/app/events/[id]/page.tsx'),
      read('src/app/volunteer/page.tsx'),
      read('src/components/Contact.tsx'),
      wishlist,
      read('src/app/newsletter/page.tsx'),
    ]
    for (const source of stakeholderSources) {
      expect(source).not.toContain('<figcaption')
      expect(source).not.toContain('photo-note')
      expect(source).not.toMatch(/\bcaption:/)
    }

    for (const alt of [
      'Families gathered around a table for a hands-on science activity.',
      'Students exploring a science demonstration together.',
      'Young people and volunteers doing a hands-on activity outdoors at a community event',
      'A student tries a hands-on activity while volunteers staff colorful classroom tables at Altamont Creek Open House.',
      'A student presents a project to seated judges at Wildcat Tank.',
      'Students and volunteers gather outdoors for the Pedrozzi CONNECT egg-drop activity.',
      'A student volunteer guides two younger students with a robot controller.',
      'Seven student volunteers pose outdoors; one holds a small drone and controller.',
      'A young participant holds a controller beside a VEX robot.',
      'A student volunteer prepares an outdoor activity table in late-afternoon light.',
    ]) {
      expect(stakeholderSources.join('\n')).toContain(alt)
    }

    const provenance = read('docs/event-photo-review.json')
    for (const outputPath of [
      '/images/events/foil-boat-stockmens/drive-03.webp',
      '/images/events/pedrozzi-connect-egg-drop/drive-01.webp',
      '/images/events/wildcat-tank-altamont/drive-01.webp',
      '/images/events/wildcat-carnival/drive-05.webp',
    ]) {
      expect(provenance).toContain(outputPath)
    }
  })
})
