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

    expect(routes.volunteer).toContain('/images/events/family-science-night/IMG_5898.jpg')
    expect(routes.volunteer).toContain('A student volunteer guides two younger students with a robot controller.')
    expect(routes.fundraiser).toContain('/images/events/wildcat-tank/Outdoor2.JPG')
    expect(routes.fundraiser).toContain('A student volunteer helps a younger participant at an outdoor foil-boat activity table.')
    expect(routes.wishlist).toContain('/images/events/family-science-night/IMG_5880.jpg')
    expect(routes.wishlist).toContain('A young participant holds a controller beside a VEX robot.')
    expect(routes.newsletter).toContain('/images/events/wildcat-carnival/drive-05.webp')
    expect(routes.newsletter).toContain('A student volunteer prepares an outdoor activity table in late-afternoon light.')
    expect(routes.faq).toContain('photoRibbon')
    expect(routes.faq).toContain('/images/events/family-science-night/IMG_6049.jpg')
    expect(routes.faq).toContain('/images/events/foil-boat-stockmens/drive-03.webp')
    expect(routes.faq).toContain('/images/events/wildcat-tank-altamont/drive-03.webp')
    expect(routes.contact).toContain('/images/events/pedrozzi-connect-egg-drop/drive-04.webp')
    expect(routes.contact).toContain('Seven student volunteers pose outdoors')

    for (const source of Object.values(routes)) {
      expect(source).not.toContain('text-[6.8rem]')
      expect(source).not.toContain('border-l-4')
      expect(source).toContain('next/image')
    }
  })

  it('keeps designated route photography unique and preserves the Contact photo contract', () => {
    const about = readSource('components/About.tsx')
    const team = readSource('components/Team.tsx')
    const volunteer = readSource('app/volunteer/page.tsx')
    const fundraiser = readSource('app/fundraiser/page.tsx')
    const wishlist = readSource('app/wishlist/page.tsx')
    const newsletter = readSource('app/newsletter/page.tsx')
    const faq = readSource('app/faq/page.tsx')
    const contact = readSource('components/Contact.tsx')

    const designatedPhotos = [
      '/images/events/altamont-creek-open-house/cover.png',
      '/images/events/wildcat-tank-altamont/drive-01.webp',
      '/images/events/pedrozzi-connect-egg-drop/drive-01.webp',
      '/images/events/family-science-night/IMG_0551.jpg',
      '/images/events/family-science-night/IMG_5898.jpg',
      '/images/events/wildcat-tank/Outdoor2.JPG',
      '/images/events/family-science-night/IMG_5880.jpg',
      '/images/events/wildcat-carnival/drive-05.webp',
      '/images/events/family-science-night/IMG_6049.jpg',
      '/images/events/foil-boat-stockmens/drive-03.webp',
      '/images/events/wildcat-tank-altamont/drive-03.webp',
    ]

    expect(new Set(designatedPhotos).size).toBe(designatedPhotos.length)
    const designatedSources = [about, team, volunteer, fundraiser, wishlist, newsletter, faq].join('\n')
    for (const photo of designatedPhotos) expect(designatedSources).toContain(photo)

    expect(contact).toContain('/images/events/pedrozzi-connect-egg-drop/drive-04.webp')
    expect(contact).toContain('Seven student volunteers pose outdoors; one holds a small drone and controller.')
    expect(contact).toContain('Bring the idea, question, or next practical step.')
  })

  it('removes old route-specific photography while allowing one shared Events fallback', () => {
    const sources = {
      about: readSource('components/About.tsx'),
      team: readSource('components/Team.tsx'),
      volunteer: readSource('app/volunteer/page.tsx'),
      fundraiser: readSource('app/fundraiser/page.tsx'),
      wishlist: readSource('app/wishlist/page.tsx'),
      newsletter: readSource('app/newsletter/page.tsx'),
      faq: readSource('app/faq/page.tsx'),
      events: readSource('app/events/page.tsx'),
      detail: readSource('app/events/[id]/page.tsx'),
    }

    const removedByRoute = {
      about: [
        '/images/events/science-odyssey/drive-01.webp',
        '/images/events/science-odyssey/drive-03.webp',
        '/images/events/family-science-night-altamont/drive-02.webp',
      ],
      team: ['/images/events/pedrozzi-connect-egg-drop/drive-04.webp'],
      volunteer: ['/images/events/family-science-night-altamont/drive-04.webp'],
      fundraiser: ['/images/events/science-odyssey/drive-01.webp'],
      wishlist: ['/images/events/family-science-night-altamont/drive-01.webp'],
      newsletter: ['/images/events/wildcat-carnival/drive-04.webp'],
      faq: [
        '/images/events/family-science-night/IMG_0547.jpg',
        '/images/events/science-odyssey/drive-01.webp',
        '/images/events/pedrozzi-connect-egg-drop/drive-04.webp',
      ],
      events: ['/images/events/science-odyssey/drive-01.webp'],
      detail: ['/images/events/science-odyssey/drive-01.webp'],
    } as const

    for (const [route, removedPhotos] of Object.entries(removedByRoute)) {
      for (const photo of removedPhotos) expect(sources[route as keyof typeof sources]).not.toContain(photo)
    }

    const fallback = '/images/events/family-science-night/IMG_8332.JPG'
    expect(sources.events.split(fallback).length - 1).toBe(1)
    expect(sources.detail.split(fallback).length - 1).toBe(1)
    expect(sources.events).toContain('A Pillars of Tech volunteer and participant operate a VEX robot during Family Science Night.')
    expect(sources.detail).toContain('A Pillars of Tech volunteer and participant operate a VEX robot during Family Science Night.')
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
