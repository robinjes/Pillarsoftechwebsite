import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const repositoryMocks = vi.hoisted(() => ({
  createPublicClient: vi.fn(),
}))

vi.mock('server-only', () => ({}))
vi.mock('@/lib/supabase/public', () => ({
  createSupabasePublicClient: repositoryMocks.createPublicClient,
}))

import { listPublicEvents, listPublicImpact } from '@/lib/content-repository'

describe('public events and navigation regressions', () => {
  beforeEach(() => {
    repositoryMocks.createPublicClient.mockReset()
  })

  it('keeps the desktop navigation limited to five primary choices', () => {
    const navbar = readFileSync(join(process.cwd(), 'src/components/Navbar.tsx'), 'utf8')

    for (const label of ['For Families', 'Events', 'Our Work', 'Volunteer', 'Contact']) {
      expect(navbar).toContain(label)
    }
    for (const label of ['Branches', 'Support', 'Fundraiser', 'Wishlist', 'Newsletter', 'FAQ']) {
      expect(navbar).not.toContain(label)
    }
  })

  it('uses the safe checked-in event snapshot when the public Supabase read fails', async () => {
    const order = vi.fn().mockResolvedValue({
      data: null,
      error: { code: '42P01', message: 'relation public.events does not exist' },
    })
    const neq = vi.fn(() => ({ order }))
    const eq = vi.fn(() => ({ neq }))
    const select = vi.fn(() => ({ eq }))
    repositoryMocks.createPublicClient.mockReturnValue({
      from: vi.fn(() => ({ select })),
    })

    const events = await listPublicEvents()

    expect(events.some((event) => event.status === 'upcoming')).toBe(true)
    expect(events.some((event) => event.status === 'completed')).toBe(true)
  })

  it('publishes separate Stockmen’s Park event records with closed registration', async () => {
    repositoryMocks.createPublicClient.mockReturnValue(null)

    const events = await listPublicEvents()
    const event2025 = events.find((event) => event.id === 'foil-boat-stockmens')
    const event2026 = events.find((event) => event.id === 'science-at-stockmens-park-2026')

    expect(event2025).toBeDefined()
    expect(event2026).toBeDefined()
    expect(event2025?.id).not.toBe(event2026?.id)
    expect(event2025).toMatchObject({
      title: 'Science at Stockmen’s Park 2025',
      branch: 'ca',
      status: 'completed',
      startLabel: '10/4/25',
      endLabel: '3 Hours',
      location: 'Stockmens Park',
      participantRegistrationState: 'closed',
      volunteerRegistrationState: 'closed',
      media: {
        image: '/images/events/foil-boat-stockmens/drive-01.webp',
        imageAlt: 'People stand beside the outdoor Build-a-Boat Competition table at Stockmens Park.',
        heroImage: '/images/events/foil-boat-stockmens/drive-01.webp',
        heroImageAlt: 'People stand beside the outdoor Build-a-Boat Competition table at Stockmens Park.',
        gallery: [
          '/images/events/foil-boat-stockmens/drive-01.webp',
          '/images/events/foil-boat-stockmens/drive-02.webp',
          '/images/events/foil-boat-stockmens/drive-03.webp',
        ],
        galleryAlts: [
          'People stand beside the outdoor Build-a-Boat Competition table at Stockmens Park.',
          'Students gather around water tubs to test hand-built foil boats at Stockmens Park.',
          'An older student helps children test a foil boat in a water tub.',
        ],
      },
    })
    expect(event2025?.description).toContain('Foil Boat Competition')
    expect(event2025?.description).toContain('science of buoyancy, stability, and design')
    expect(event2026).toMatchObject({
      title: 'Science at Stockmen’s Park 2026',
      branch: 'ca',
      status: 'completed',
      startsAt: null,
      startLabel: '2026 — date not recorded',
      endLabel: 'Not recorded',
      location: 'Stockmen’s Park',
      participantRegistrationState: 'closed',
      volunteerRegistrationState: 'closed',
      media: {
        image: '/potofficiallogo.png',
        imageAlt: 'Pillars of Tech logo',
        heroImage: '/potofficiallogo.png',
        heroImageAlt: 'Pillars of Tech logo',
        gallery: undefined,
      },
      description: 'Pillars of Tech completed Science at Stockmen’s Park in 2026.',
    })
  })

  it('uses the safe checked-in impact snapshot when the public Supabase read fails', async () => {
    const order = vi.fn().mockResolvedValue({
      data: null,
      error: { code: '42P01', message: 'relation public.impact_metrics does not exist' },
    })
    const select = vi.fn(() => ({ order }))
    repositoryMocks.createPublicClient.mockReturnValue({
      from: vi.fn(() => ({ select })),
    })

    const metrics = await listPublicImpact()

    expect(metrics.length).toBeGreaterThan(0)
    expect(metrics.every((metric) => metric.sourceUrl && metric.methodologyNote)).toBe(true)
  })
})
