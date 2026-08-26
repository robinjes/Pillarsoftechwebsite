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

  it('closes the desktop Support menu when the pointer leaves it', () => {
    const navbar = readFileSync(join(process.cwd(), 'src/components/Navbar.tsx'), 'utf8')

    expect(navbar).toContain('const [isSupportOpen, setIsSupportOpen] = useState(false)')
    expect(navbar).toContain('onMouseEnter={() => setIsSupportOpen(true)}')
    expect(navbar).toContain('onMouseLeave={() => setIsSupportOpen(false)}')
    expect(navbar).toContain('aria-expanded={isSupportOpen}')
    expect(navbar).not.toContain('<details')
    for (const label of ['For families', 'Events', 'Our work', 'Volunteer', 'Branches', 'Contact']) {
      expect(navbar).toContain(label)
    }
  })

  it('keeps the visual gap inside the Support menu hover target', () => {
    const navbar = readFileSync(join(process.cwd(), 'src/components/Navbar.tsx'), 'utf8')

    expect(navbar).toContain('className="absolute right-0 top-full min-w-48 pt-2"')
    expect(navbar).not.toContain('top-full mt-2')
  })

  it('uses the safe checked-in event snapshot when the public Supabase read fails', async () => {
    const order = vi.fn().mockResolvedValue({
      data: null,
      error: { code: '42P01', message: 'relation public.events does not exist' },
    })
    const neq = vi.fn(() => ({ order }))
    const select = vi.fn(() => ({ neq }))
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
