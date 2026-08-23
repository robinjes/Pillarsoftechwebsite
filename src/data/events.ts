import type { PublicEvent } from '@/lib/content-contracts'

// Public pages use this compatibility view while the API and database use the
// canonical EventRecord contract. The legacy aliases are presentation-only;
// private capacities, outcomes, publication state, and audit fields are not
// part of this type.
export type Event = PublicEvent & {
  guests?: string[]
  stats?: { label: string; value: string }[]
}
