import type { PublicEvent } from '@/lib/content-contracts'

export function publicEventPath(event: Pick<PublicEvent, 'id' | 'slug'>): string {
  return event.id === 'career-panel-granada'
    ? '/careerpanel'
    : `/events/${encodeURIComponent(event.slug || event.id)}`
}
