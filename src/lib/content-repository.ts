import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'

import {
  contentDocumentSchema,
  eventRecordSchema,
  formSchema,
  impactMetricSchema,
  publicImpactMetricSchema,
  publicEventSchema,
  type ContentDocument,
  type EventRecord,
  type EventWrite,
  type FormDefinition,
  type ImpactMetric,
  type PublicEvent,
} from '@/lib/content-contracts'
import { getPublicEventSnapshot, toPublicEvent } from '@/lib/event-snapshot'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service'

export class ContentRepositoryError extends Error {
  readonly status: 400 | 404 | 409 | 503

  constructor(message: string, status: 400 | 404 | 409 | 503 = 503) {
    super(message)
    this.name = 'ContentRepositoryError'
    this.status = status
  }
}

function rowError(error: unknown, fallback = 'Content storage is temporarily unavailable.'): never {
  const message = error && typeof error === 'object' && 'message' in error ? String(error.message) : fallback
  throw new ContentRepositoryError(message, 503)
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

function publicEventFromRow(row: Record<string, unknown>): PublicEvent {
  // Public column grants intentionally omit publication, capacity, outcomes,
  // and audit fields. RLS has already restricted this row to published data.
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

async function publicClient(): Promise<SupabaseClient | null> {
  return createSupabaseServerClient()
}

function serviceClient(): SupabaseClient {
  try {
    return createSupabaseServiceRoleClient()
  } catch {
    throw new ContentRepositoryError('Supabase write storage is not configured.', 503)
  }
}

export async function listPublicEvents(): Promise<PublicEvent[]> {
  const client = await publicClient()
  if (!client) return getPublicEventSnapshot()

  const { data, error } = await client
    .from('events')
    .select('id,slug,title,summary,description,starts_at,ends_at,timezone,start_label,end_label,location,program_category,status,media,resources,participant_registration_state,volunteer_registration_state')
    .neq('status', 'draft')
    .order('starts_at', { ascending: true, nullsFirst: false })
  if (error) rowError(error)
  return asRows(data).map(publicEventFromRow)
}

export async function getPublicEvent(eventId: string): Promise<PublicEvent | null> {
  const events = await listPublicEvents()
  return events.find((event) => event.id === eventId || event.slug === eventId) ?? null
}

export async function getPublicParticipantForm(eventId: string): Promise<FormDefinition | null> {
  const client = await publicClient()
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
  const client = await publicClient()
  if (!client) return []
  const { data, error } = await client
    .from('impact_metrics')
    .select('key,value,unit,public_label,as_of,source_url,methodology_note,display_order')
    .order('display_order', { ascending: true })
  if (error) rowError(error)
  return asRows(data).flatMap((row) => {
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
  if (error) throw new ContentRepositoryError(error.message || 'Event could not be created.', error.code === '23505' ? 409 : 503)
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
    created_by: userId,
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
  if (error) throw new ContentRepositoryError(error.message || 'Form could not be saved.', error.code === '23505' ? 409 : 503)
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
    created_by: userId,
  }
  const { data, error } = await client.from('impact_metrics').upsert(payload).select('*').single()
  if (error) throw new ContentRepositoryError(error.message || 'Impact metric could not be saved.', error.code === '23505' ? 409 : 503)
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
    created_by: userId,
  }).select('*').single()
  if (error) throw new ContentRepositoryError(error.message || 'Content could not be saved.', error.code === '23505' ? 409 : 503)
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

export async function participantRegistrationCount(eventId: string): Promise<number> {
  const client = serviceClient()
  const { count, error } = await client.from('participant_registrations').select('id', { count: 'exact', head: true }).eq('event_id', eventId)
  if (error) rowError(error)
  return count ?? 0
}

export async function insertParticipantRegistration(eventId: string, submittedData: Record<string, unknown>): Promise<string> {
  const client = serviceClient()
  const { data, error } = await client.from('participant_registrations').insert({ event_id: eventId, submitted_data: submittedData }).select('id').single()
  if (error) rowError(error)
  const id = data && typeof data === 'object' && 'id' in data ? String(data.id) : ''
  if (!id) throw new ContentRepositoryError('Registration could not be confirmed.', 503)
  return id
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
