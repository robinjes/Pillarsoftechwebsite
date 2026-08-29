import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'

import { previewImpactSnapshot } from '@/data/impact-snapshot'
import {
  contentDocumentSchema,
  branchCodeSchema,
  branchDocumentSchema,
  emptyBranchDocument,
  isPublishableBranchDocument,
  contactStatusSchema,
  contactSubmissionRecordSchema,
  eventRecordSchema,
  formSchema,
  impactMetricSchema,
  publicImpactMetricSchema,
  publicEventSchema,
  type ContentDocument,
  type BranchCode,
  type BranchDocument,
  type ContactStatus,
  type ContactSubmissionRecord,
  type EventRecord,
  type EventWrite,
  type FormDefinition,
  type ImpactMetric,
  type PublicEvent,
} from '@/lib/content-contracts'
import { decodeContactCursor, encodeContactCursor } from '@/lib/contact-pagination'
import { getPublicEventSnapshot, toPublicEvent } from '@/lib/event-snapshot'
import { createSupabasePublicClient } from '@/lib/supabase/public'
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service'

const safeRepositoryMessages = new Set([
  'Content storage is temporarily unavailable.',
  'Stored event content is invalid.',
  'Stored form content is invalid.',
  'Stored impact content is invalid.',
  'Stored site content is invalid.',
  'Stored branch content is invalid.',
  'Branch content could not be saved.',
  'Branch not found.',
  'The event is not public.',
  'Supabase write storage is not configured.',
  'An event with this identifier already exists.',
  'Event not found.',
  'Form not found.',
  'A form already exists for this event and kind.',
  'Impact metric not found.',
  'An impact metric with this key already exists.',
  'Site content with this key already exists.',
  'Event registration is unavailable.',
  'Registration is closed or full.',
  'Registration is full.',
  'Invalid registration answers.',
  'Registration is temporarily unavailable.',
  'Registration could not be confirmed.',
  'Contact submission not found.',
  'Contact status could not be changed.',
])

function safeRepositoryMessage(message: string, status: ContentRepositoryError['status']): string {
  if (safeRepositoryMessages.has(message)) return message
  if (status === 400) return 'Invalid content operation.'
  if (status === 404) return 'Content not found.'
  if (status === 409) return 'Content conflict.'
  return 'Content storage is temporarily unavailable.'
}

export class ContentRepositoryError extends Error {
  readonly status: 400 | 404 | 409 | 503

  constructor(message: string, status: 400 | 404 | 409 | 503 = 503) {
    super(safeRepositoryMessage(message, status))
    this.name = 'ContentRepositoryError'
    this.status = status
  }
}

function rowError(_error: unknown, fallback = 'Content storage is temporarily unavailable.'): never {
  throw new ContentRepositoryError(fallback, 503)
}

function text(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
}

export function eventFromRow(row: Record<string, unknown>): EventRecord {
  const parsed = eventRecordSchema.safeParse({
    id: text(row.id),
    slug: text(row.slug),
    branch: text(row.branch),
    title: text(row.title),
    summary: text(row.summary),
    description: text(row.description),
    startsAt: row.starts_at == null ? null : text(row.starts_at),
    endsAt: row.ends_at == null ? null : text(row.ends_at),
    timezone: text(row.timezone) || 'America/New_York',
    startLabel: text(row.start_label),
    endLabel: text(row.end_label),
    location: text(row.location),
    programCategory: text(row.program_category) || 'general',
    status: row.status,
    media: record(row.media),
    resources: record(row.resources),
    participantRegistrationState: row.participant_registration_state,
    volunteerRegistrationState: row.volunteer_registration_state,
    participantCapacity: row.participant_capacity == null ? null : Number(row.participant_capacity),
    volunteerCapacity: row.volunteer_capacity == null ? null : Number(row.volunteer_capacity),
    outcomes: record(row.outcomes),
    publicationState: row.publication_state,
  })
  if (!parsed.success) throw new ContentRepositoryError('Stored event content is invalid.', 503)
  return parsed.data
}

export function formFromRow(row: Record<string, unknown>): FormDefinition {
  const parsed = formSchema.safeParse({
    id: text(row.id),
    eventId: text(row.event_id),
    kind: row.kind,
    fields: row.fields,
    isActive: row.is_active,
  })
  if (!parsed.success) throw new ContentRepositoryError('Stored form content is invalid.', 503)
  return parsed.data
}

export function impactFromRow(row: Record<string, unknown>): ImpactMetric {
  const parsed = impactMetricSchema.safeParse({
    key: text(row.key),
    value: Number(row.value),
    unit: text(row.unit),
    publicLabel: text(row.public_label),
    asOf: row.as_of == null ? null : text(row.as_of),
    sourceUrl: text(row.source_url),
    methodologyNote: text(row.methodology_note),
    approvalStatus: row.approval_status,
    displayOrder: Number(row.display_order),
  })
  if (!parsed.success) throw new ContentRepositoryError('Stored impact content is invalid.', 503)
  return parsed.data
}

export function contentFromRow(row: Record<string, unknown>): ContentDocument {
  const parsed = contentDocumentSchema.safeParse({
    key: text(row.key),
    title: text(row.title),
    body: text(row.body),
    content: record(row.content),
    publicationState: row.publication_state,
    safeForPublic: row.safe_for_public,
  })
  if (!parsed.success) throw new ContentRepositoryError('Stored site content is invalid.', 503)
  return parsed.data
}

function unknownArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : []
}

/**
 * Parse a dedicated branch_documents row. This intentionally does not use the
 * loose site_content contract: every admin and public branch read crosses the
 * strict branchDocumentSchema before it can be returned or rendered.
 */
export function branchDocumentFromRow(row: Record<string, unknown>): BranchDocument {
  const parsed = branchDocumentSchema.safeParse({
    key: text(row.key),
    branch: text(row.branch),
    name: text(row.name),
    serviceArea: text(row.service_area),
    leaders: unknownArray(row.leaders),
    programs: unknownArray(row.programs),
    contactRoute: record(row.contact_route),
    photos: unknownArray(row.photos),
    associatedEventIds: unknownArray(row.associated_event_ids),
    cta: record(row.cta),
    publicationState: row.publication_state,
    safeForPublic: row.safe_for_public,
    approval: {
      status: row.approval_status,
      approvedAt: row.approved_at == null ? null : text(row.approved_at),
      ...(row.approved_by == null ? {} : { approvedBy: text(row.approved_by) }),
    },
  })
  if (!parsed.success) throw new ContentRepositoryError('Stored branch content is invalid.', 503)
  return parsed.data
}

function contactFromRow(row: Record<string, unknown>): ContactSubmissionRecord {
  const parsed = contactSubmissionRecordSchema.safeParse({
    id: text(row.id),
    name: text(row.name),
    email: text(row.email),
    subject: text(row.subject),
    schoolName: text(row.school_name),
    studentCount: text(row.student_count),
    message: text(row.message),
    status: row.status,
    createdAt: text(row.created_at),
    updatedAt: text(row.updated_at),
  })
  if (!parsed.success) throw new ContentRepositoryError('Stored contact submissions are invalid.', 503)
  return parsed.data
}

function publicEventFromRow(row: Record<string, unknown>): PublicEvent {
  // The query may read publication_state solely to apply an explicit published
  // predicate. This public projection still omits publication, capacity,
  // outcomes, and audit fields; RLS also restricts the row to published data.
  const event = toPublicEvent(eventFromRow({
    ...row,
    publication_state: 'published',
    participant_capacity: null,
    volunteer_capacity: null,
    outcomes: {},
  }))
  if (!event) throw new ContentRepositoryError('The event is not public.', 404)
  const parsed = publicEventSchema.safeParse(event)
  if (!parsed.success) throw new ContentRepositoryError('Stored public event content is invalid.', 503)
  return parsed.data
}

function asRows(data: unknown): Record<string, unknown>[] {
  return Array.isArray(data) ? data as Record<string, unknown>[] : []
}

function publicClient(): SupabaseClient | null {
  return createSupabasePublicClient()
}

function serviceClient(): SupabaseClient {
  try {
    return createSupabaseServiceRoleClient()
  } catch {
    throw new ContentRepositoryError('Supabase write storage is not configured.', 503)
  }
}

export async function listPublicEvents(branch?: BranchCode): Promise<PublicEvent[]> {
  if (branch !== undefined && !branchCodeSchema.safeParse(branch).success) {
    throw new ContentRepositoryError('Invalid event branch.', 400)
  }
  const client = publicClient()
  if (!client) {
    const snapshot = getPublicEventSnapshot()
    return branch ? snapshot.filter((event) => event.branch === branch) : snapshot
  }

  let query = client
    .from('events')
    .select('id,slug,branch,title,summary,description,starts_at,ends_at,timezone,start_label,end_label,location,program_category,status,media,resources,participant_registration_state,volunteer_registration_state,publication_state')
  if (branch) query = query.eq('branch', branch)
  const { data, error } = await query
    .eq('publication_state', 'published')
    .neq('status', 'draft')
    .order('starts_at', { ascending: true, nullsFirst: false })
  if (error) {
    const snapshot = getPublicEventSnapshot()
    return branch ? snapshot.filter((event) => event.branch === branch) : snapshot
  }
  return asRows(data).map(publicEventFromRow)
}

export async function getPublicEvent(eventId: string): Promise<PublicEvent | null> {
  const events = await listPublicEvents()
  return events.find((event) => event.id === eventId || event.slug === eventId) ?? null
}

const publicBranchSelect = 'key,branch,name,service_area,leaders,programs,contact_route,photos,associated_event_ids,cta,publication_state,safe_for_public,approval_status,approved_at'

function branchKey(branch: BranchCode): string {
  return `branch:${branch}`
}

function branchDbPayload(document: BranchDocument, userId: string): Record<string, unknown> {
  return {
    key: document.key,
    branch: document.branch,
    name: document.name,
    service_area: document.serviceArea,
    leaders: document.leaders,
    programs: document.programs,
    contact_route: document.contactRoute,
    photos: document.photos,
    associated_event_ids: document.associatedEventIds,
    cta: document.cta,
    publication_state: document.publicationState,
    safe_for_public: document.safeForPublic,
    approval_status: document.approval.status,
    approved_at: document.approval.approvedAt,
    approved_by: document.approval.approvedBy ?? null,
    updated_by: userId,
  }
}

export async function listAdminBranches(): Promise<BranchDocument[]> {
  const client = serviceClient()
  const { data, error } = await client.from('branch_documents').select('*').order('branch', { ascending: true })
  if (error) rowError(error)
  const documents = asRows(data).map(branchDocumentFromRow)
  // Empty defaults keep the protected editor useful before an operator has
  // inserted either packet, while GA remains unpublished and unrenderable.
  return (['ca', 'ga'] as BranchCode[]).map((branch) => documents.find((document) => document.branch === branch) ?? emptyBranchDocument(branch))
}

export async function getPublicBranchDocument(branch: BranchCode): Promise<BranchDocument | null> {
  if (!branchCodeSchema.safeParse(branch).success) return null
  const client = publicClient()
  // Unlike event snapshots, an absent branch database row must never fall
  // back to local content: that could expose an unpublished Georgia packet.
  if (!client) return null
  const { data, error } = await client
    .from('branch_documents')
    .select(publicBranchSelect)
    .eq('key', branchKey(branch))
    .eq('branch', branch)
    .eq('publication_state', 'published')
    .eq('safe_for_public', true)
    .eq('approval_status', 'approved')
    .not('approved_at', 'is', null)
    .maybeSingle()
  if (error || !data) return null
  try {
    const document = branchDocumentFromRow(data as Record<string, unknown>)
    return isPublishableBranchDocument(document) ? document : null
  } catch {
    return null
  }
}

export async function saveAdminBranch(document: BranchDocument, userId: string): Promise<BranchDocument> {
  const client = serviceClient()
  const { data, error } = await client
    .from('branch_documents')
    .upsert(branchDbPayload(document, userId), { onConflict: 'key' })
    .select('*')
    .single()
  if (error) {
    throw new ContentRepositoryError(
      error.code === '23505' ? 'Branch not found.' : 'Branch content could not be saved.',
      error.code === '23505' ? 404 : 503,
    )
  }
  return branchDocumentFromRow(data as Record<string, unknown>)
}

export async function getPublicParticipantForm(eventId: string): Promise<FormDefinition | null> {
  const client = publicClient()
  if (!client) return null
  const { data, error } = await client
    .from('registration_forms')
    .select('id,event_id,kind,fields,is_active')
    .eq('event_id', eventId)
    .eq('kind', 'participant')
    .eq('is_active', true)
    .maybeSingle()
  if (error) rowError(error)
  return data ? formFromRow(data as Record<string, unknown>) : null
}

export async function listPublicImpact(): Promise<ReturnType<typeof publicImpactMetricSchema.parse>[]> {
  const client = publicClient()
  if (!client) return previewImpactSnapshot
  const { data, error } = await client
    .from('impact_metrics')
    .select('key,value,unit,public_label,as_of,source_url,methodology_note,display_order')
    .order('display_order', { ascending: true })
  if (error) return previewImpactSnapshot
  const approvedMetrics = asRows(data).flatMap((row) => {
    const parsed = publicImpactMetricSchema.safeParse({
      key: text(row.key),
      value: Number(row.value),
      unit: text(row.unit),
      publicLabel: text(row.public_label),
      asOf: row.as_of == null ? '' : text(row.as_of),
      sourceUrl: text(row.source_url),
      methodologyNote: text(row.methodology_note),
      displayOrder: Number(row.display_order),
    })
    return parsed.success ? [parsed.data] : []
  })
  return approvedMetrics.length > 0 ? approvedMetrics : previewImpactSnapshot
}

export function slugifyEventTitle(title: string): string {
  const slug = title.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 56)
  return slug || `event-${crypto.randomUUID().replace(/-/g, '').slice(0, 12)}`
}

function eventDbPayload(event: EventWrite, userId: string, includeCreatedBy: boolean): Record<string, unknown> {
  const id = event.id ?? event.slug ?? slugifyEventTitle(event.title)
  const slug = event.slug ?? id
  return {
    id,
    slug,
    branch: event.branch,
    title: event.title,
    summary: event.summary,
    description: event.description,
    starts_at: event.startsAt,
    ends_at: event.endsAt,
    timezone: event.timezone,
    start_label: event.startLabel,
    end_label: event.endLabel,
    location: event.location,
    program_category: event.programCategory,
    status: event.status,
    media: event.media,
    resources: event.resources,
    participant_registration_state: event.participantRegistrationState,
    volunteer_registration_state: event.volunteerRegistrationState,
    participant_capacity: event.participantCapacity,
    volunteer_capacity: event.volunteerCapacity,
    outcomes: event.outcomes,
    publication_state: event.publicationState,
    updated_by: userId,
    ...(includeCreatedBy ? { created_by: userId } : {}),
  }
}

export async function listAdminEvents(): Promise<EventRecord[]> {
  const client = serviceClient()
  const { data, error } = await client.from('events').select('*').order('starts_at', { ascending: false, nullsFirst: false })
  if (error) rowError(error)
  return asRows(data).map(eventFromRow)
}

export async function createAdminEvent(input: EventWrite, userId: string): Promise<EventRecord> {
  const client = serviceClient()
  const payload = eventDbPayload(input, userId, true)
  const { data, error } = await client.from('events').insert(payload).select('*').single()
  if (error) {
    throw new ContentRepositoryError(
      error.code === '23505' ? 'An event with this identifier already exists.' : 'Event could not be created.',
      error.code === '23505' ? 409 : 503,
    )
  }
  return eventFromRow(data as Record<string, unknown>)
}

export async function updateAdminEvent(id: string, input: EventWrite, userId: string): Promise<EventRecord> {
  const client = serviceClient()
  const payload = eventDbPayload({ ...input, id }, userId, false)
  delete payload.created_by
  const { data, error } = await client.from('events').update(payload).eq('id', id).select('*').maybeSingle()
  if (error) rowError(error)
  if (!data) throw new ContentRepositoryError('Event not found.', 404)
  return eventFromRow(data as Record<string, unknown>)
}

export async function setAdminEventState(id: string, action: 'publish' | 'unpublish' | 'archive', userId: string): Promise<EventRecord> {
  const client = serviceClient()
  const { data: current, error: currentError } = await client.from('events').select('status').eq('id', id).maybeSingle()
  if (currentError) rowError(currentError)
  if (!current) throw new ContentRepositoryError('Event not found.', 404)
  const update = action === 'publish'
    ? { publication_state: 'published', status: current.status === 'draft' ? 'upcoming' : current.status, updated_by: userId }
    : action === 'unpublish'
    ? { publication_state: 'unpublished', updated_by: userId }
    : { publication_state: 'unpublished', status: 'cancelled', updated_by: userId }
  const { data, error } = await client.from('events').update(update).eq('id', id).select('*').maybeSingle()
  if (error) rowError(error)
  if (!data) throw new ContentRepositoryError('Event not found.', 404)
  return eventFromRow(data as Record<string, unknown>)
}

export async function deleteAdminEvent(id: string): Promise<void> {
  const client = serviceClient()
  const { data, error } = await client.from('events').delete().eq('id', id).select('id').maybeSingle()
  if (error) rowError(error)
  if (!data) throw new ContentRepositoryError('Event not found.', 404)
}

function formDbPayload(form: FormDefinition, userId: string): Record<string, unknown> {
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(form.id)
  return {
    event_id: form.eventId,
    kind: form.kind,
    fields: form.fields,
    is_active: form.isActive,
    updated_by: userId,
    ...(uuid ? { id: form.id } : {}),
  }
}

export async function listAdminForms(eventId?: string, kind?: 'participant' | 'volunteer'): Promise<FormDefinition[]> {
  const client = serviceClient()
  let query = client.from('registration_forms').select('*').order('updated_at', { ascending: false })
  if (eventId) query = query.eq('event_id', eventId)
  if (kind) query = query.eq('kind', kind)
  const { data, error } = await query
  if (error) rowError(error)
  return asRows(data).map(formFromRow)
}

export async function saveAdminForm(form: FormDefinition, userId: string): Promise<FormDefinition> {
  const client = serviceClient()
  const payload = formDbPayload(form, userId)
  const { data, error } = await client.from('registration_forms').upsert(payload, { onConflict: 'event_id,kind' }).select('*').single()
  if (error) {
    throw new ContentRepositoryError(
      error.code === '23505' ? 'A form already exists for this event and kind.' : 'Form could not be saved.',
      error.code === '23505' ? 409 : 503,
    )
  }
  return formFromRow(data as Record<string, unknown>)
}

export async function disableAdminForm(eventId: string, kind: 'participant' | 'volunteer', userId: string): Promise<FormDefinition> {
  const client = serviceClient()
  const { data, error } = await client.from('registration_forms').update({ is_active: false, updated_by: userId }).eq('event_id', eventId).eq('kind', kind).select('*').maybeSingle()
  if (error) rowError(error)
  if (!data) throw new ContentRepositoryError('Form not found.', 404)
  return formFromRow(data as Record<string, unknown>)
}

export async function listAdminImpact(): Promise<ImpactMetric[]> {
  const client = serviceClient()
  const { data, error } = await client.from('impact_metrics').select('*').order('display_order', { ascending: true })
  if (error) rowError(error)
  return asRows(data).map(impactFromRow)
}

export async function saveAdminImpact(metric: ImpactMetric, userId: string): Promise<ImpactMetric> {
  const client = serviceClient()
  const payload = {
    key: metric.key,
    value: metric.value,
    unit: metric.unit,
    public_label: metric.publicLabel,
    as_of: metric.asOf,
    source_url: metric.sourceUrl,
    methodology_note: metric.methodologyNote,
    approval_status: metric.approvalStatus,
    display_order: metric.displayOrder,
    updated_by: userId,
  }
  const { data, error } = await client.from('impact_metrics').upsert(payload).select('*').single()
  if (error) {
    throw new ContentRepositoryError(
      error.code === '23505' ? 'An impact metric with this key already exists.' : 'Impact metric could not be saved.',
      error.code === '23505' ? 409 : 503,
    )
  }
  return impactFromRow(data as Record<string, unknown>)
}

export async function deleteAdminImpact(key: string): Promise<void> {
  const client = serviceClient()
  const { data, error } = await client.from('impact_metrics').delete().eq('key', key).select('key').maybeSingle()
  if (error) rowError(error)
  if (!data) throw new ContentRepositoryError('Impact metric not found.', 404)
}

export async function listAdminContent(key?: string): Promise<ContentDocument[]> {
  const client = serviceClient()
  let query = client.from('site_content').select('*').order('key', { ascending: true })
  if (key) query = query.eq('key', key)
  const { data, error } = await query
  if (error) rowError(error)
  return asRows(data).map(contentFromRow)
}

export async function saveAdminContent(document: ContentDocument, userId: string): Promise<ContentDocument> {
  const client = serviceClient()
  const { data, error } = await client.from('site_content').upsert({
    key: document.key,
    title: document.title,
    body: document.body,
    content: document.content,
    publication_state: document.publicationState,
    safe_for_public: document.safeForPublic,
    updated_by: userId,
  }).select('*').single()
  if (error) {
    throw new ContentRepositoryError(
      error.code === '23505' ? 'Site content with this key already exists.' : 'Content could not be saved.',
      error.code === '23505' ? 409 : 503,
    )
  }
  return contentFromRow(data as Record<string, unknown>)
}

export async function getParticipantRegistrationContext(eventId: string): Promise<{ event: Record<string, unknown>; form: FormDefinition } | null> {
  const client = serviceClient()
  const { data: event, error: eventError } = await client
    .from('events')
    .select('id,publication_state,participant_registration_state,participant_capacity')
    .eq('id', eventId)
    .maybeSingle()
  if (eventError) rowError(eventError)
  if (!event) return null
  const { data: form, error: formError } = await client
    .from('registration_forms')
    .select('id,event_id,kind,fields,is_active')
    .eq('event_id', eventId)
    .eq('kind', 'participant')
    .eq('is_active', true)
    .maybeSingle()
  if (formError) rowError(formError)
  if (!form) return null
  return { event: event as Record<string, unknown>, form: formFromRow(form as Record<string, unknown>) }
}

export async function insertParticipantRegistration(eventId: string, submittedData: Record<string, unknown>): Promise<string> {
  const client = serviceClient()
  const { data, error } = await client.rpc('register_participant', {
    p_event_id: eventId,
    p_submitted_data: submittedData,
  })
  if (error) {
    // The registration RPC intentionally uses stable SQLSTATEs. Never expose
    // its database message, which may contain schema or constraint details.
    if (error.code === 'P0002') throw new ContentRepositoryError('Event registration is unavailable.', 404)
    if (error.code === 'P0003') throw new ContentRepositoryError('Registration is closed or full.', 409)
    if (error.code === 'P0004') throw new ContentRepositoryError('Registration is full.', 409)
    if (error.code === 'P0005') throw new ContentRepositoryError('Invalid registration answers.', 400)
    throw new ContentRepositoryError('Registration is temporarily unavailable.', 503)
  }
  const id = typeof data === 'string'
    ? data
    : data && typeof data === 'object' && 'id' in data
    ? String(data.id)
    : ''
  if (!id) throw new ContentRepositoryError('Registration could not be confirmed.', 503)
  return id
}

const contactSelect = 'id,name,email,message,subject,school_name,student_count,status,created_at,updated_at'

export interface AdminContactListOptions {
  limit?: number
  cursor?: string
  status?: ContactStatus
}

export interface AdminContactListResult {
  submissions: ContactSubmissionRecord[]
  nextCursor: string | null
}

export async function listAdminContact(options: AdminContactListOptions = {}): Promise<AdminContactListResult> {
  const limit = options.limit ?? 25
  if (!Number.isInteger(limit) || limit < 1 || limit > 50) {
    throw new ContentRepositoryError('Invalid contact pagination.', 400)
  }
  if (options.status !== undefined && !contactStatusSchema.safeParse(options.status).success) {
    throw new ContentRepositoryError('Invalid contact status.', 400)
  }

  let cursor = null
  if (options.cursor !== undefined) {
    cursor = decodeContactCursor(options.cursor)
    if (!cursor) throw new ContentRepositoryError('Invalid contact cursor.', 400)
  }

  const client = serviceClient()
  let query = client
    .from('contact_submissions')
    .select(contactSelect)
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(limit + 1)

  if (options.status) query = query.eq('status', options.status)
  if (cursor) {
    // Keyset pagination keeps the list bounded and stable when new messages
    // arrive while staff are paging through the inbox.
    query = query.or(`created_at.lt.${cursor.createdAt},and(created_at.eq.${cursor.createdAt},id.lt.${cursor.id})`)
  }

  const { data, error } = await query
  if (error) rowError(error)

  const rows = asRows(data)
  const hasNextPage = rows.length > limit
  const page = rows.slice(0, limit).map(contactFromRow)
  const last = page[page.length - 1]

  return {
    submissions: page,
    nextCursor: hasNextPage && last ? encodeContactCursor(last.createdAt, last.id) : null,
  }
}

export async function updateAdminContactStatus(id: string, status: ContactStatus): Promise<ContactSubmissionRecord> {
  if (!contactStatusSchema.safeParse(status).success) {
    throw new ContentRepositoryError('Invalid contact status.', 400)
  }

  const client = serviceClient()
  const { data, error } = await client
    .from('contact_submissions')
    .update({ status })
    .eq('id', id)
    .select(contactSelect)
    .maybeSingle()
  if (error) rowError(error, 'Contact status could not be changed.')
  if (!data) throw new ContentRepositoryError('Contact submission not found.', 404)
  return contactFromRow(data as Record<string, unknown>)
}

export async function insertContactSubmission(payload: { name: string; email: string; message: string; subject?: string; schoolName?: string; studentCount?: string }): Promise<void> {
  const client = serviceClient()
  const { error } = await client.from('contact_submissions').insert({
    name: payload.name,
    email: payload.email,
    message: payload.message,
    subject: payload.subject ?? '',
    school_name: payload.schoolName ?? '',
    student_count: payload.studentCount ?? '',
  })
  if (error) rowError(error)
}

export async function listParticipantRegistrations(eventId: string): Promise<Record<string, unknown>[]> {
  const client = serviceClient()
  const { data, error } = await client.from('participant_registrations').select('id,event_id,submitted_data,created_at').eq('event_id', eventId).order('created_at', { ascending: true })
  if (error) rowError(error)
  return asRows(data)
}
