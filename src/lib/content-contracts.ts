import { z } from 'zod'

import { getSupabasePublicConfig } from '@/lib/supabase/config'

export const MAX_EVENT_TEXT = 12_000
export const MAX_FORM_FIELDS = 40
export const MAX_FORM_OPTIONS = 30
export const MAX_CONTACT_MESSAGE = 5_000
export const MAX_PARTICIPANT_ANSWER = 2_000

const approvedResourceHosts = new Set([
  'pillarsoftech.org',
  'www.pillarsoftech.org',
  'pillarsoftech.com',
  'www.pillarsoftech.com',
  'hcb.hackclub.com',
  'forms.gle',
  'docs.google.com',
  'sites.google.com',
  'youtube.com',
  'www.youtube.com',
  'youtu.be',
  'www.youtu.be',
  'youtube-nocookie.com',
  'www.youtube-nocookie.com',
])

const safeIdPattern = /^[a-z0-9][a-z0-9_-]{0,63}$/
const safeFieldIdPattern = /^[a-z][a-z0-9_-]{0,31}$/

export function isSafeLocalPath(value: string): boolean {
  return (
    value.startsWith('/') &&
    !value.startsWith('//') &&
    !value.includes('\\') &&
    !value.split('/').includes('..') &&
    !/%2e/i.test(value) &&
    !/[\u0000-\u001f\u007f]/.test(value)
  )
}

function configuredSupabaseHost(): string | null {
  const config = getSupabasePublicConfig()
  if (!config) return null

  try {
    return new URL(config.url).hostname.toLowerCase()
  } catch {
    return null
  }
}

export function isApprovedResourceUrl(value: string, extraHosts: string[] = []): boolean {
  const trimmed = value.trim()
  if (!trimmed || trimmed.length > 2_048) return false
  if (isSafeLocalPath(trimmed)) return true
  if (/^(?:javascript|data|blob|file|mailto|tel):/i.test(trimmed)) return false
  if (trimmed.startsWith('//') || /[\u0000-\u001f\u007f]/.test(trimmed)) return false

  try {
    const parsed = new URL(trimmed)
    if (parsed.protocol !== 'https:' || parsed.username || parsed.password) return false

    const host = parsed.hostname.toLowerCase()
    const allowedHosts = new Set([...approvedResourceHosts, ...extraHosts.map((item) => item.toLowerCase())])
    const supabaseHost = configuredSupabaseHost()
    if (supabaseHost) allowedHosts.add(supabaseHost)
    return allowedHosts.has(host)
  } catch {
    return false
  }
}

export const safeResourceUrlSchema = z.string().trim().max(2_048).refine(isApprovedResourceUrl, {
  message: 'Use a local path or an approved HTTPS origin.',
})

const safeId = z.string().trim().regex(safeIdPattern, 'Use a lowercase identifier with letters, numbers, _ or -.')
const safeFieldId = z.string().trim().regex(safeFieldIdPattern, 'Use a short lowercase field identifier.')
const nonEmptyText = (max: number) => z.string().trim().min(1).max(max)
const optionalText = (max: number) => z.string().trim().max(max)

const isoDateTime = z.string().trim().refine((value) => {
  const parsed = Date.parse(value)
  return Number.isFinite(parsed) && /T/i.test(value)
}, 'Use an ISO date-time.')

const isoDate = z.string().trim().refine((value) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const parsed = new Date(`${value}T00:00:00.000Z`)
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().startsWith(value)
}, 'Use a valid YYYY-MM-DD date.')

const mediaSchema = z.object({
  image: safeResourceUrlSchema.optional(),
  imageAlt: optionalText(500).optional(),
  heroImage: safeResourceUrlSchema.optional(),
  heroImageAlt: optionalText(500).optional(),
  heroVideo: safeResourceUrlSchema.optional(),
  gallery: z.array(safeResourceUrlSchema).max(40).optional(),
  galleryAlts: z.array(optionalText(500)).max(40).optional(),
  youtubeVideos: z.array(safeResourceUrlSchema).max(20).optional(),
}).strict().superRefine((media, context) => {
  const galleryAltCount = (media.galleryAlts ?? []).filter((alt) => alt.length > 0).length
  const galleryCount = media.gallery?.length ?? 0
  if (galleryAltCount > galleryCount) {
    context.addIssue({ code: 'custom', path: ['galleryAlts'], message: 'Gallery alt text cannot outnumber gallery images.' })
  }
})

const resourcesSchema = z.object({
  pdfUrl: safeResourceUrlSchema.optional(),
  registrationLink: safeResourceUrlSchema.optional(),
  registrationNote: optionalText(500).optional(),
}).strict()

const outcomesSchema = z.record(z.string().trim().min(1).max(80), z.string().trim().max(500)).refine(
  (value) => Object.keys(value).length <= 30,
  'Too many outcome fields.',
)

const eventShape = {
  id: safeId,
  slug: safeId,
  title: nonEmptyText(240),
  summary: optionalText(1_000),
  description: optionalText(MAX_EVENT_TEXT),
  startsAt: isoDateTime.nullable(),
  endsAt: isoDateTime.nullable(),
  timezone: z.string().trim().min(1).max(80),
  startLabel: optionalText(240),
  endLabel: optionalText(240),
  location: optionalText(500),
  programCategory: safeId,
  status: z.enum(['draft', 'upcoming', 'ongoing', 'completed', 'cancelled']),
  media: mediaSchema,
  resources: resourcesSchema,
  participantRegistrationState: z.enum(['closed', 'open', 'full']),
  volunteerRegistrationState: z.enum(['closed', 'open', 'full']),
  participantCapacity: z.number().int().positive().nullable(),
  volunteerCapacity: z.number().int().positive().nullable(),
  outcomes: outcomesSchema,
  publicationState: z.enum(['unpublished', 'published']),
}

export const eventRecordSchema = z.object(eventShape).strict().superRefine((event, context) => {
  if (event.startsAt && event.endsAt && Date.parse(event.startsAt) >= Date.parse(event.endsAt)) {
    context.addIssue({ code: 'custom', path: ['endsAt'], message: 'End must be after start.' })
  }
  if (event.publicationState === 'published' && event.status === 'draft') {
    context.addIssue({ code: 'custom', path: ['publicationState'], message: 'Draft events cannot be published.' })
  }
})

export type EventRecord = z.infer<typeof eventRecordSchema>

export const eventWriteSchema = z.object({
  ...eventShape,
  id: safeId.optional(),
  slug: safeId.optional(),
}).strict().superRefine((event, context) => {
  if (event.startsAt && event.endsAt && Date.parse(event.startsAt) >= Date.parse(event.endsAt)) {
    context.addIssue({ code: 'custom', path: ['endsAt'], message: 'End must be after start.' })
  }
  if (event.publicationState === 'published' && event.status === 'draft') {
    context.addIssue({ code: 'custom', path: ['publicationState'], message: 'Draft events cannot be published.' })
  }
})

export type EventWrite = z.infer<typeof eventWriteSchema>

export const publicEventSchema = z.object({
  id: safeId,
  slug: safeId,
  title: nonEmptyText(240),
  summary: optionalText(1_000),
  description: optionalText(MAX_EVENT_TEXT),
  startsAt: isoDateTime.nullable(),
  endsAt: isoDateTime.nullable(),
  timezone: z.string().trim().min(1).max(80),
  startLabel: optionalText(240),
  endLabel: optionalText(240),
  location: optionalText(500),
  programCategory: safeId,
  status: z.enum(['upcoming', 'ongoing', 'completed', 'cancelled']),
  media: mediaSchema,
  resources: resourcesSchema,
  participantRegistrationState: z.enum(['closed', 'open', 'full']),
  volunteerRegistrationState: z.enum(['closed', 'open', 'full']),
  // These aliases are intentionally presentation-only compatibility fields for
  // the existing public pages. They contain no private capacity/audit data.
  date: optionalText(240),
  time: optionalText(240),
  image: safeResourceUrlSchema.optional(),
  imageAlt: optionalText(500).optional(),
  heroImage: safeResourceUrlSchema.optional(),
  heroImageAlt: optionalText(500).optional(),
  heroVideo: safeResourceUrlSchema.optional(),
  gallery: z.array(safeResourceUrlSchema).max(40).optional(),
  galleryAlts: z.array(optionalText(500)).max(40).optional(),
  pdfUrl: safeResourceUrlSchema.optional(),
  youtubeVideos: z.array(safeResourceUrlSchema).max(20).optional(),
  registrationLink: safeResourceUrlSchema.optional(),
  registrationNote: optionalText(500).optional(),
}).strict()

export type PublicEvent = z.infer<typeof publicEventSchema>

const formFieldBaseSchema = z.object({
  id: safeFieldId,
  type: z.enum(['text', 'email', 'textarea', 'select', 'radio', 'checkbox']),
  label: nonEmptyText(160),
  required: z.boolean(),
  options: z.array(nonEmptyText(120)).max(MAX_FORM_OPTIONS).optional(),
  consent: z.boolean().optional(),
}).strict()

export const formFieldSchema = formFieldBaseSchema.superRefine((field, context) => {
  if ((field.type === 'select' || field.type === 'radio') && (!field.options || field.options.length === 0)) {
    context.addIssue({ code: 'custom', path: ['options'], message: 'Select and radio fields need options.' })
  }
  if (!['select', 'radio'].includes(field.type) && field.options && field.options.length > 0) {
    context.addIssue({ code: 'custom', path: ['options'], message: 'Options are only valid for select/radio fields.' })
  }
  if (field.options && new Set(field.options).size !== field.options.length) {
    context.addIssue({ code: 'custom', path: ['options'], message: 'Options must be unique.' })
  }
})

export type FormField = z.infer<typeof formFieldSchema>

const formShape = {
  id: z.string().trim().min(1).max(80),
  eventId: safeId,
  kind: z.enum(['participant', 'volunteer']),
  fields: z.array(formFieldSchema).max(MAX_FORM_FIELDS),
  isActive: z.boolean(),
}

export const formSchema = z.object(formShape).strict().superRefine((form, context) => {
  const ids = form.fields.map((field) => field.id)
  if (new Set(ids).size !== ids.length) {
    context.addIssue({ code: 'custom', path: ['fields'], message: 'Field IDs must be unique.' })
  }
})

export type FormDefinition = z.infer<typeof formSchema>

export const formWriteSchema = z.object(formShape).strict().superRefine((form, context) => {
  const ids = form.fields.map((field) => field.id)
  if (new Set(ids).size !== ids.length) {
    context.addIssue({ code: 'custom', path: ['fields'], message: 'Field IDs must be unique.' })
  }
})

export const formLookupSchema = z.object({
  eventId: safeId,
  kind: z.enum(['participant', 'volunteer']).default('participant'),
}).strict()

export const impactMetricSchema = z.object({
  key: safeId,
  value: z.number().finite(),
  unit: optionalText(80),
  publicLabel: nonEmptyText(240),
  asOf: isoDate.nullable(),
  // Pending drafts may be intentionally unsourced; approval validation below
  // requires a source, methodology, and asOf before publication.
  sourceUrl: safeResourceUrlSchema.or(z.literal('')),
  methodologyNote: optionalText(2_000),
  approvalStatus: z.enum(['pending', 'approved', 'rejected']),
  displayOrder: z.number().int().min(0).max(10_000),
}).strict().superRefine((metric, context) => {
  if (metric.approvalStatus === 'approved') {
    if (!metric.asOf) context.addIssue({ code: 'custom', path: ['asOf'], message: 'Approved metrics need asOf.' })
    if (!metric.sourceUrl) context.addIssue({ code: 'custom', path: ['sourceUrl'], message: 'Approved metrics need a source.' })
    if (!metric.methodologyNote) context.addIssue({ code: 'custom', path: ['methodologyNote'], message: 'Approved metrics need methodology.' })
  }
})

export type ImpactMetric = z.infer<typeof impactMetricSchema>

export const publicImpactMetricSchema = z.object({
  key: safeId,
  value: z.number().finite(),
  unit: optionalText(80),
  publicLabel: nonEmptyText(240),
  asOf: isoDate,
  sourceUrl: safeResourceUrlSchema,
  methodologyNote: nonEmptyText(2_000),
  displayOrder: z.number().int().min(0).max(10_000),
}).strict()

export type PublicImpactMetric = z.infer<typeof publicImpactMetricSchema>

export const participantSubmissionSchema = z.object({
  eventId: safeId,
  answers: z.record(safeFieldId, z.union([z.string().trim().max(MAX_PARTICIPANT_ANSWER), z.boolean()])).superRefine((answers, context) => {
    if (Object.keys(answers).length > MAX_FORM_FIELDS) {
      context.addIssue({ code: 'custom', message: `A maximum of ${MAX_FORM_FIELDS} answers is allowed.` })
    }
  }),
  honeypot: z.string().trim().max(100).default(''),
}).strict().superRefine((payload, context) => {
  if (payload.honeypot !== '') {
    context.addIssue({ code: 'custom', path: ['honeypot'], message: 'Invalid submission.' })
  }
})

export type ParticipantSubmission = z.infer<typeof participantSubmissionSchema>

export const contactSubmissionSchema = z.object({
  name: nonEmptyText(160),
  email: z.email().max(320),
  subject: optionalText(240),
  schoolName: optionalText(240).optional(),
  studentCount: optionalText(80).optional(),
  message: nonEmptyText(MAX_CONTACT_MESSAGE),
  honeypot: z.string().trim().max(100).default(''),
}).strict().superRefine((payload, context) => {
  if (payload.honeypot !== '') {
    context.addIssue({ code: 'custom', path: ['honeypot'], message: 'Invalid submission.' })
  }
})

export type ContactSubmission = z.infer<typeof contactSubmissionSchema>

export const contactStatusSchema = z.enum(['new', 'in_progress', 'resolved', 'spam'])

export type ContactStatus = z.infer<typeof contactStatusSchema>

/**
 * This is the server/admin representation of a stored contact row. It is
 * deliberately separate from contactSubmissionSchema: the public schema
 * accepts only the fields a visitor may submit, while this schema describes
 * the private fields returned to an already-authorized staff caller.
 */
export const contactSubmissionRecordSchema = z.object({
  id: z.uuid(),
  name: nonEmptyText(160),
  email: z.email().max(320),
  subject: optionalText(240),
  schoolName: optionalText(240),
  studentCount: optionalText(80),
  message: nonEmptyText(MAX_CONTACT_MESSAGE),
  status: contactStatusSchema,
  createdAt: isoDateTime,
  updatedAt: isoDateTime,
}).strict()

export type ContactSubmissionRecord = z.infer<typeof contactSubmissionRecordSchema>

export const adminContactListQuerySchema = z.object({
  cursor: z.string().trim().min(1).max(256).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(25),
  status: contactStatusSchema.optional(),
}).strict()

export type AdminContactListQuery = z.infer<typeof adminContactListQuerySchema>

export const adminContactStatusUpdateSchema = z.object({
  id: z.uuid(),
  status: contactStatusSchema,
}).strict()

export type AdminContactStatusUpdate = z.infer<typeof adminContactStatusUpdateSchema>

export const contentDocumentSchema = z.object({
  key: safeId,
  title: optionalText(240),
  body: optionalText(MAX_EVENT_TEXT),
  content: z.record(z.string().trim().min(1).max(80), z.string().trim().max(5_000)),
  publicationState: z.enum(['unpublished', 'published']),
  safeForPublic: z.boolean(),
}).strict()

export type ContentDocument = z.infer<typeof contentDocumentSchema>

export function toSafeCsvCell(value: unknown): string {
  const text = String(value ?? '')
  // Spreadsheet formula prefixes remain dangerous when preceded by tabs,
  // spaces, or other control characters. Keep the original value intact while
  // adding a literal prefix before the first potentially executable marker.
  const formulaSafe = /^[\s\p{Cc}]*[=+\-@]/u.test(text) ? `'${text}` : text
  return /[",\r\n]/.test(formulaSafe) ? `"${formulaSafe.replace(/"/g, '""')}"` : formulaSafe
}

export function toCsv(rows: Record<string, unknown>[], columns: string[]): string {
  const lines = [columns.map(toSafeCsvCell).join(',')]
  for (const row of rows) lines.push(columns.map((column) => toSafeCsvCell(row[column])).join(','))
  return `${lines.join('\r\n')}\r\n`
}

export function validateParticipantAnswers(form: FormDefinition, payload: ParticipantSubmission) {
  const expected = new Set(form.fields.map((field) => field.id))
  const actual = new Set(Object.keys(payload.answers))
  const issues: string[] = []

  for (const id of actual) if (!expected.has(id)) issues.push(`Unknown answer: ${id}`)
  for (const field of form.fields) {
    if (!actual.has(field.id)) {
      if (field.required) issues.push(`Missing answer: ${field.id}`)
      continue
    }
    const value = payload.answers[field.id]
    const empty = value === '' || value === false
    if (field.required && empty) issues.push(`Required answer is empty: ${field.id}`)
    if (field.type === 'checkbox' && typeof value !== 'boolean') issues.push(`Checkbox answer must be boolean: ${field.id}`)
    if (field.type !== 'checkbox' && typeof value !== 'string') issues.push(`Answer must be text: ${field.id}`)
    if (field.type === 'email' && typeof value === 'string') {
      const parsed = z.email().safeParse(value)
      if (!parsed.success) issues.push(`Invalid email answer: ${field.id}`)
    }
    if ((field.type === 'select' || field.type === 'radio') && typeof value === 'string' && !field.options?.includes(value)) {
      issues.push(`Invalid option: ${field.id}`)
    }
  }

  return issues
}

export function normalizeLegacyDateTime(date: unknown, time: unknown): { startsAt: string | null; startLabel: string; endLabel: string } {
  const dateLabel = typeof date === 'string' ? date.trim() : ''
  const timeLabel = typeof time === 'string' ? time.trim() : ''
  const parsed = Date.parse(dateLabel)
  return {
    startsAt: Number.isFinite(parsed) ? new Date(parsed).toISOString() : null,
    startLabel: dateLabel,
    endLabel: timeLabel,
  }
}
