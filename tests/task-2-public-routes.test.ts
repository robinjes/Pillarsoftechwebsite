import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

const root = process.cwd()
const read = (relativePath: string) => readFileSync(join(root, relativePath), 'utf8')

describe('Task 2 public route migration and support surfaces', () => {
  it('gives every public route an intentional metadata surface', () => {
    const routeFiles = [
      'src/app/about/page.tsx',
      'src/app/team/page.tsx',
      'src/app/events/page.tsx',
      'src/app/events/[id]/page.tsx',
      'src/app/register/[eventId]/page.tsx',
      'src/app/volunteer/page.tsx',
      'src/app/wildcat-tank/page.tsx',
      'src/app/photos/wildcat-tank/page.tsx',
      'src/app/fundraiser/page.tsx',
      'src/app/wishlist/page.tsx',
      'src/app/newsletter/page.tsx',
      'src/app/faq/page.tsx',
      'src/app/contact/page.tsx',
      'src/app/privacy/page.tsx',
      'src/app/accessibility/page.tsx',
    ]

    const metadataSources: Record<string, string> = {
      'src/app/events/page.tsx': read('src/app/events/layout.tsx'),
      'src/app/events/[id]/page.tsx': read('src/app/events/[id]/layout.tsx'),
      'src/app/register/[eventId]/page.tsx': read('src/app/register/layout.tsx'),
      'src/app/volunteer/page.tsx': read('src/app/volunteer/layout.tsx'),
    }

    for (const routeFile of routeFiles) {
      const source = metadataSources[routeFile] ?? read(routeFile)
      expect(source, routeFile).toMatch(/export (?:const metadata|async function generateMetadata)/)
      expect(source, routeFile).toContain('title:')
      expect(source, routeFile).toContain('description:')
    }
  })

  it('keeps the About trust record and explains how impact is measured honestly', () => {
    const about = read('src/components/About.tsx')
    expect(about).toContain('Our mission')
    expect(about).toContain('Hands-on events')
    expect(about).toContain('Fiscally sponsored through Hack Club')
    expect(about).toContain('https://hcb.hackclub.com/pillars-of-tech/transactions')
    expect(about).toMatch(/impact methodology|How we measure impact/i)
    expect(about).toMatch(/source|methodology/i)
    expect(about).toContain('href="/contact"')
  })

  it('keeps approved Team people, roles, portraits, and both join paths', () => {
    const team = read('src/components/Team.tsx')
    for (const name of ['Robin Jeshua Deepak', 'Yashas Jeedi', 'Rahul Eapen', 'Jaden Jirasevijinda', 'Rohan Munagapati', 'Michael Nolan McClung', 'Nikhil Madineni', 'Arya Rajavelu']) {
      expect(team).toContain(name)
    }
    for (const portrait of ['/robin.jpg', '/yashas.jpg', '/rahul.jpg', '/jaden.jpg', '/rohan.jpg', '/nolan.jpg', '/nikhil.jpg', '/arya.jpg']) {
      expect(team).toContain(portrait)
    }
    expect(team).toContain('https://forms.gle/XqeKkMF4cj5W62yL9')
    expect(team).toContain('href="/volunteer"')
  })

  it('labels event status and branch while preserving loading, detail, registration, and volunteer contracts', () => {
    const events = read('src/app/events/page.tsx')
    const detail = read('src/app/events/[id]/page.tsx')
    const registration = read('src/app/register/[eventId]/page.tsx')

    for (const status of ["event.status === 'upcoming'", "event.status === 'ongoing'", "event.status === 'completed'", "event.status === 'cancelled'"]) {
      expect(events).toContain(status)
    }
    expect(events).toContain('Branch not listed')
    expect(events).not.toContain('EventWithBranch')
    expect(events).not.toContain("event as EventWithBranch")
    expect(events).toContain("fetch('/api/events')")
    expect(detail).toContain('Age guidance')
    expect(detail).toContain('Accessibility and help')
    expect(detail).toContain('Materials')
    expect(detail).toContain('Schedule')
    expect(detail).toContain('Cancellation')
    expect(detail).toContain('Register as a participant')
    expect(detail).toContain('Volunteer at this event')
    expect(detail).toContain('resolveEventImageAlt')
    expect(registration).toContain("fetch(`/api/forms?eventId=${encodeURIComponent(eventId)}`)")
    expect(registration).toContain("fetch('/api/registrations/participant'")
    expect(registration).toContain('answers: formData, honeypot')
    expect(registration).toMatch(/sent only to the registration record/i)
  })

  it('preserves volunteer account/history/member-code behavior and the staff check-in boundary', () => {
    const volunteer = read('src/app/volunteer/page.tsx')
    const checkin = read('src/app/volunteer/checkin/page.tsx')
    for (const contract of ['signInWithGoogle', 'registerForEvent', 'withdrawFromEvent', 'getMySignups', 'LocalMemberQr', 'memberCode', 'totalHours']) {
      expect(volunteer).toContain(contract)
    }
    expect(volunteer).toContain('deepLinkedEventId')
    expect(checkin).toContain("profile.role !== 'staff'")
    expect(checkin).toContain("router.replace('/volunteer')")
  })

  it('keeps program, donation, wishlist, newsletter, FAQ, and contact actions discoverable', () => {
    const supportSources = [
      read('src/app/wildcat-tank/page.tsx'),
      read('src/app/photos/wildcat-tank/page.tsx'),
      read('src/app/fundraiser/page.tsx'),
      read('src/app/wishlist/page.tsx'),
      read('src/app/newsletter/page.tsx'),
      read('src/app/faq/page.tsx'),
      read('src/components/Contact.tsx'),
      read('src/data/newsletter.ts'),
    ].join('\n')

    for (const text of ['Wildcat Tank', 'hcb.hackclub.com/donations/start/pillars-of-tech', 'hcb.hackclub.com/pillars-of-tech/transactions', 'Microcontrollers', 'newsletterSignupUrl', '<details', 'contact-form', 'pillarsoftech@gmail.com']) {
      expect(supportSources).toContain(text)
    }
    expect(supportSources).toMatch(/Hack Club handles checkout/i)
    expect(supportSources).toMatch(/Every Sunday/i)
    expect(supportSources).toMatch(/For families/i)
  })

  it('publishes privacy and accessibility commitments without claiming unavailable capabilities', () => {
    const privacy = read('src/app/privacy/page.tsx')
    const accessibility = read('src/app/accessibility/page.tsx')
    for (const source of [privacy, accessibility]) {
      expect(source).toContain('href="/contact"')
      expect(source).toMatch(/known limitations/i)
      expect(source).toMatch(/chatbot|AI replies/i)
      expect(source).toMatch(/under-13|guardian/i)
      expect(source).toMatch(/passwords|home addresses|school schedules|medical information|emergency requests/i)
    }
    expect(privacy).toMatch(/HttpOnly|SameSite=Lax|Secure/i)
    expect(privacy).toMatch(/30 days/i)
    expect(accessibility).toMatch(/keyboard|focus|reduced motion/i)
  })

  it('adds friendly not-found and redacted root error surfaces', () => {
    expect(existsSync(join(root, 'src/app/not-found.tsx'))).toBe(true)
    expect(existsSync(join(root, 'src/app/error.tsx'))).toBe(true)
    expect(existsSync(join(root, 'src/app/global-error.tsx'))).toBe(true)
    const notFound = read('src/app/not-found.tsx')
    const error = read('src/app/error.tsx')
    const globalError = read('src/app/global-error.tsx')
    expect(notFound).toContain('href="/events"')
    expect(notFound).toContain('href="/contact"')
    for (const source of [error, globalError]) {
      expect(source).toMatch(/Something went wrong|temporarily unavailable/i)
      expect(source).toContain('href="/contact"')
      expect(source).not.toContain('{error.message}')
      expect(source).not.toContain('{digest}')
      expect(source).toMatch(/Try again|Reload/i)
    }
  })

  it('keeps support/legal routes in the public navigation and footer', () => {
    const navbar = read('src/components/Navbar.tsx')
    const footer = read('src/components/Footer.tsx')
    for (const href of ['/privacy', '/accessibility']) {
      expect(navbar).toContain(href)
      expect(footer).toContain(href)
    }
  })
})
