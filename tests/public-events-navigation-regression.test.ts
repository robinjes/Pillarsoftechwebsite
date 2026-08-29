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

    for (const label of ['For families', 'Events', 'Our work', 'Volunteer', 'Contact']) {
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
