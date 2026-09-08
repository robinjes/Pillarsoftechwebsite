import { publicImpactMetricSchema, type PublicImpactMetric } from '@/lib/content-contracts'

/**
 * A dated preview snapshot keeps the public homepage useful while Supabase is
 * not configured locally. These are source-backed claims, not a replacement
 * for the approved rows in Supabase; the repository always prefers those rows.
 */
const previewImpactMetrics = [
  {
    key: 'students_reached',
    value: 1_000,
    unit: '+',
    publicLabel: 'Students reached',
    asOf: '2026-08-18',
    sourceUrl: 'https://www.pillarsoftech.org/',
    methodologyNote: 'The official homepage reports 1,000+ students reached, while the About page also frames 1,000+ as a 2026 goal. Neither page documents whether the count represents unique students, so leadership confirmation remains required before production.',
    displayOrder: 1,
  },
  {
    key: 'hcb_revenue',
    value: 223,
    unit: 'USD',
    publicLabel: 'Total HCB revenue',
    asOf: '2026-08-18',
    sourceUrl: 'https://hcb.hackclub.com/pillars-of-tech/transactions',
    methodologyNote: 'Public HCB ledger total revenue observed on August 18, 2026. HCB remains the source of record for the amount shown here.',
    displayOrder: 2,
  },
  {
    key: 'volunteer_hours',
    value: 100,
    unit: '+',
    publicLabel: 'Volunteer hours',
    asOf: '2026-08-18',
    sourceUrl: 'https://www.pillarsoftech.org/about',
    methodologyNote: 'The current About page reports 100+ volunteer hours. The underlying attendance and hour-calculation method remains for leadership confirmation.',
    displayOrder: 3,
  },
] satisfies PublicImpactMetric[]

// Parse at module load so the preview cannot silently drift outside the same
// public contract used for approved Supabase content.
export const previewImpactSnapshot: PublicImpactMetric[] = previewImpactMetrics.map((metric) => publicImpactMetricSchema.parse(metric))
