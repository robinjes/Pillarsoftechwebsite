import { readFileSync } from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

const sourceRoot = path.resolve(process.cwd(), 'src')
const readSource = (relativePath: string) => readFileSync(path.join(sourceRoot, relativePath), 'utf8')

describe('action and support route visual contracts', () => {
  it('uses distinct, source-owned event photography without the old oversized hero treatment', () => {
    const routes = {
      volunteer: readSource('app/volunteer/page.tsx'),
      fundraiser: readSource('app/fundraiser/page.tsx'),
      wishlist: readSource('app/wishlist/page.tsx'),
      newsletter: readSource('app/newsletter/page.tsx'),
      faq: readSource('app/faq/page.tsx'),
      contact: readSource('components/Contact.tsx'),
    }

    expect(routes.volunteer).toContain('/images/events/family-science-night-altamont/drive-04.webp')
    expect(routes.fundraiser).toContain('/images/events/science-odyssey/drive-01.webp')
    expect(routes.wishlist).toContain('/images/events/family-science-night-altamont/drive-01.webp')
    expect(routes.newsletter).toContain('/images/events/wildcat-carnival/drive-04.webp')
    expect(routes.faq).toContain('photoRibbon')
    expect(routes.contact).toContain('/images/events/pedrozzi-connect-egg-drop/drive-04.webp')
    expect(routes.fundraiser).toContain('marshmallows and toothpicks')
    expect(routes.newsletter).toContain('white stretchy mixture over a pink bowl')
    expect(routes.contact).toContain('Seven student volunteers pose outdoors')

    for (const source of Object.values(routes)) {
      expect(source).not.toContain('text-[6.8rem]')
      expect(source).not.toContain('border-l-4')
      expect(source).toContain('next/image')
    }
  })

  it('keeps each action boundary available to visitors', () => {
    const volunteer = readSource('app/volunteer/page.tsx')
    const fundraiser = readSource('app/fundraiser/page.tsx')
    const wishlist = readSource('app/wishlist/page.tsx')
    const newsletter = readSource('app/newsletter/page.tsx')
    const faq = readSource('app/faq/page.tsx')
    const contact = readSource('components/Contact.tsx')

    expect(volunteer).toContain('volunteerService.signInWithGoogle')
    expect(volunteer).toContain('volunteerService.registerForEvent')
    expect(volunteer).toContain('volunteerService.withdrawFromEvent')
    expect(volunteer).toContain('LocalMemberQr')
    expect(volunteer).toContain('eventId=')
    expect(volunteer).toContain('deepLinkedEventId')

    expect(fundraiser).toContain('ExternalEmbedOptIn')
    expect(fundraiser).toContain('hcb.hackclub.com/donations/start/pillars-of-tech')
    expect(fundraiser).toContain('hcb.hackclub.com/pillars-of-tech/transactions')
    expect(fundraiser).toContain('does not receive your card details')

    for (const title of ['Microcontrollers', 'Laptops and Chromebooks', 'Robotics Components', 'Soldering Supplies', 'Tablets and Input Devices']) {
      expect(wishlist).toContain(title)
    }
    expect(wishlist).toContain('/contact?reason=wishlist')

    expect(newsletter).toContain('newsletterEmbedUrl')
    expect(newsletter).toContain('newsletterSignupUrl')
    expect(newsletter).toContain('ExternalEmbedOptIn')
    expect(faq).toContain('<details')
    expect(faq).toContain('/contact')

    expect(contact).toContain('useSearchParams')
    expect(contact).toContain("fetch('/api/contact'")
    expect(contact).toContain('subjectOptions')
    expect(contact).toContain('contact-form')
  })
})
