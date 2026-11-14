import type { PublicEvent } from '@/lib/content-contracts'

export function publicEventPath(event: Pick<PublicEvent, 'id' | 'slug'>): string {
  if (event.id === 'wildcat-tank-pt-2') return '/wildcattankwinter'
  return event.id === 'career-panel-granada'
    ? '/careerpanel'
    : `/events/${encodeURIComponent(event.slug || event.id)}`
}
