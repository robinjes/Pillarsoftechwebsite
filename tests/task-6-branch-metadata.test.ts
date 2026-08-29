import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import {
  branchDocumentSchema,
  emptyBranchDocument,
  eventWriteSchema,
  isPublishableBranchDocument,
} from '@/lib/content-contracts'
import { getEventSnapshotRecords, legacyEventToRecord } from '@/lib/event-snapshot'

const root = process.cwd()
const read = (relativePath: string) => readFileSync(join(root, relativePath), 'utf8')

const baseEvent = {
  title: 'Branch-safe event',
  summary: 'A confirmed public event.',
  description: 'A confirmed public event.',
  startsAt: null,
  endsAt: null,
  timezone: 'America/New_York',
  startLabel: 'September 1, 2026',
  endLabel: 'September 1, 2026',
  location: 'Community room',
  programCategory: 'general',
  status: 'upcoming' as const,
  media: { image: '/images/events/cover.png', gallery: [], youtubeVideos: [] },
  resources: {},
  participantRegistrationState: 'closed' as const,
  volunteerRegistrationState: 'closed' as const,
  participantCapacity: null,
  volunteerCapacity: null,
  outcomes: {},
  publicationState: 'unpublished' as const,
}

function completeBranch(branch: 'ca' | 'ga' = 'ga') {
  return {
    ...emptyBranchDocument(branch),
    name: branch === 'ga' ? 'Approved Georgia Branch' : 'California Branch',
    serviceArea: 'Owner-approved service area',
    leaders: [{ name: 'Approved leader', role: 'Branch lead' }],
    programs: [{ name: 'Confirmed program', description: 'Approved program description.' }],
    contactRoute: { label: 'Contact the team', url: '/contact' },
    photos: [{ url: '/images/events/cover.png', alt: 'Approved program activity.', approved: true }],
    associatedEventIds: ['branch-safe-event'],
    cta: { label: 'See events', url: '/events' },
    publicationState: 'published' as const,
    safeForPublic: true,
    approval: { status: 'approved' as const, approvedAt: '2026-08-28T12:00:00.000Z', approvedBy: 'owner-review-1' },
  }
}

describe('Task 6 authoritative branches and publication gate', () => {
  it('defaults omitted event branches to California and never infers Georgia', () => {
    const omitted = eventWriteSchema.safeParse(baseEvent)
    expect(omitted.success).toBe(true)
    if (omitted.success) expect(omitted.data.branch).toBe('ca')

    expect(legacyEventToRecord({ id: 'location-only', title: 'Georgia school event', location: 'Georgia' })?.branch).toBe('ca')
    expect(legacyEventToRecord({ id: 'explicit-ga', title: 'Confirmed branch event', branch: 'ga' })?.branch).toBe('ga')

    const snapshot = getEventSnapshotRecords()
    expect(snapshot.length).toBeGreaterThan(0)
    expect(snapshot.every((event) => event.branch === 'ca')).toBe(true)
    const localEvents = JSON.parse(read('src/data/events.json')) as Array<{ branch?: string }>
    expect(localEvents.length).toBeGreaterThan(0)
    expect(localEvents.every((event) => event.branch === 'ca')).toBe(true)
  })

  it('keeps branch packets strict while rejecting incomplete Georgia publication', () => {
    const draft = emptyBranchDocument('ga')
    expect(branchDocumentSchema.safeParse(draft).success).toBe(true)
    expect(branchDocumentSchema.safeParse({
      ...draft,
      photos: [{ url: '/images/events/cover.png', approved: false }],
    }).success).toBe(true)
    expect(branchDocumentSchema.safeParse({ ...draft, unexpected: 'private' }).success).toBe(false)

    const incomplete = {
      ...completeBranch('ga'),
      leaders: [],
    }
    expect(branchDocumentSchema.safeParse(incomplete).success).toBe(false)

    const missingAlt = {
      ...completeBranch('ga'),
      photos: [{ url: '/images/events/cover.png', alt: '', approved: true }],
    }
    expect(branchDocumentSchema.safeParse(missingAlt).success).toBe(false)
    expect(isPublishableBranchDocument(missingAlt)).toBe(false)

    const approved = completeBranch('ga')
    expect(branchDocumentSchema.safeParse(approved).success).toBe(true)
    expect(isPublishableBranchDocument(approved)).toBe(true)
  })

  it('uses dedicated protected branch storage and authoritative admin operations', () => {
    const migration = read('supabase/migrations/202608280003_branch_documents.sql')
    const eventMigration = read('supabase/migrations/202608280002_event_branches.sql')
    const api = read('src/app/api/admin/branches/route.ts')
    const editor = read('src/app/(admin-protected)/admin/branches/page.tsx')
    const repository = read('src/lib/content-repository.ts')

    expect(migration).toContain('create table if not exists public.branch_documents')
    expect(migration).toContain('alter table public.branch_documents force row level security')
    expect(migration).toContain("insert into public.branch_documents (key, branch)\nvalues ('branch:ca', 'ca'), ('branch:ga', 'ga')")
    expect(eventMigration).toContain('alter column branch set default \'ca\'')
    expect(eventMigration).toContain('alter column branch set not null')
    expect(eventMigration).toContain('events_branch_status_start_idx')
    expect(api).toContain('requireVerifiedStaff')
    expect(api).toContain('sameOrigin(request)')
    expect(api).toContain('branchDocumentSchema.safeParse')
    expect(editor).toContain("fetch('/api/admin/branches'")
    expect(repository).toContain('branchDocumentFromRow')
    expect(repository).toContain('isPublishableBranchDocument(document)')
  })
})

describe('Task 6 gated public metadata and discovery', () => {
  it('returns no Georgia page or metadata until the validated packet is public', () => {
    const page = read('src/app/ga/page.tsx')
    const sitemap = read('src/app/sitemap.ts')
    expect(page).toContain("getPublicBranchDocument('ga')")
    expect(page).toContain('if (!document) notFound()')
    expect(page).not.toMatch(/coming\s+soon/i)
    expect(sitemap).toContain("getPublicBranchDocument('ga')")
    expect(sitemap).toContain("const routes = georgia ? [...publicStaticRoutes, '/ga'] : publicStaticRoutes")
    for (const privatePath of ['/admin', '/api', '/auth', '/register', '/volunteer/checkin', '/private']) {
      expect(sitemap).not.toContain(`'${privatePath}'`)
    }
  })

  it('keeps robots disallows and cache headers explicit', () => {
    const robots = read('src/app/robots.ts')
    const middleware = read('src/middleware.ts')
    const eventsApi = read('src/app/api/events/route.ts')
    const branchesApi = read('src/app/api/admin/branches/route.ts')
    for (const blocked of ['/admin/', '/api/', '/auth/', '/volunteer/checkin/', '/register/', '/private/', '/api/media/']) {
      expect(robots).toContain(blocked)
    }
    expect(robots).toContain("new URL('/sitemap.xml', siteOrigin()).toString()")
    for (const privatePrefix of ["'/api/admin'", "'/api/chat'", "'/api/contact'", "'/api/auth'", "'/api/me'", "'/register'"]) {
      expect(middleware).toContain(privatePrefix)
    }
    expect(eventsApi).toContain('public, max-age=60, stale-while-revalidate=300')
    expect(branchesApi).toContain('Cache-Control\': \'no-store\'')
  })

  it('records website, preview, deferred Discord, retention, and independent rollback gates', () => {
    const runbook = read('docs/security-release-runbook.md')
    for (const requirement of [
      'Task 6 adds authoritative',
      'staging project first',
      '/ga` returns a 404',
      'Organization/Event JSON-LD',
      'private `#website-live-chat`',
      '30 days',
      'close the queue and disable the public chat launcher',
      'pillarsoftech@gmail.com',
    ]) {
      expect(runbook).toContain(requirement)
    }
    expect(runbook).not.toMatch(/DISCORD_BOT_TOKEN\s*=\s*[^<\s]/)
  })

  it('uses unique validated event metadata and nonce-compatible escaped JSON-LD', () => {
    const eventLayout = read('src/app/events/[id]/layout.tsx')
    const rootLayout = read('src/app/layout.tsx')
    expect(eventLayout).toContain('export async function generateMetadata')
    expect(eventLayout).toContain('getPublicEvent(id)')
    expect(eventLayout).toContain('if (!event) notFound()')
    expect(eventLayout).toContain("type=\"application/ld+json\"")
    expect(eventLayout).toContain("replace(/</g, '\\\\u003c')")
    expect(eventLayout).toContain('nonce={nonce}')
    for (const privateField of ['participantCapacity', 'volunteerCapacity', 'registration_forms', 'audit']) {
      expect(eventLayout).not.toContain(privateField)
    }
    expect(eventLayout).not.toContain('dangerouslySetInnerHTML')
    expect(rootLayout).toContain("'@type': 'Organization'")
    expect(rootLayout).toContain("replace(/</g, '\\\\u003c')")
    expect(rootLayout).toContain('type="application/ld+json"')
    expect(rootLayout).not.toContain('dangerouslySetInnerHTML')
  })
})
