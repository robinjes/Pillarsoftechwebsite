import type { MetadataRoute } from 'next'

import { getPublicBranchDocument, listPublicEvents } from '@/lib/content-repository'

export const dynamic = 'force-dynamic'

function siteOrigin(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim()
  if (configured) {
    try {
      const parsed = new URL(configured)
      if (parsed.protocol === 'https:' || (parsed.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(parsed.hostname))) return parsed.origin
    } catch {
      // Fall through to the established canonical origin.
    }
  }
  return 'https://pillarsoftech.org'
}

const publicStaticRoutes = [
  '/',
  '/about',
  '/team',
  '/events',
  '/volunteer',
  '/fundraiser',
  '/wishlist',
  '/newsletter',
  '/faq',
  '/contact',
  '/privacy',
  '/accessibility',
  '/wildcat-tank',
  '/photos/wildcat-tank',
]

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const origin = siteOrigin()
  const [events, georgia] = await Promise.all([
    listPublicEvents().catch(() => []),
    getPublicBranchDocument('ga').catch(() => null),
  ])
  const routes = georgia ? [...publicStaticRoutes, '/ga'] : publicStaticRoutes
  const staticEntries = routes.map((path) => ({ url: new URL(path, origin).toString() }))
  const eventEntries = events.map((event) => ({
    url: new URL(`/events/${encodeURIComponent(event.slug)}`, origin).toString(),
    lastModified: event.endsAt || event.startsAt || undefined,
  }))
  return [...staticEntries, ...eventEntries]
}
