import 'server-only'

import { createHmac } from 'node:crypto'

import { consumeChatRateLimit } from '@/lib/contact-rate-limit'
import {
  CAREER_PANEL_TEMPLATE,
  validateFeedbackAnswers,
  type FeedbackAdminForm,
  type FeedbackAdminSnapshot,
  type FeedbackAnswers,
  type FeedbackKind,
  type FeedbackPublicForm,
  type FeedbackQuestion,
  type FeedbackQuestionInput,
  type FeedbackResults,
} from '@/lib/feedback-contracts'
import { isValidQnaVisitorToken } from '@/lib/qna-contracts'
import { getRequestIdentity } from '@/lib/request-identity'
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service'

const FEEDBACK_VISITOR_DOMAIN = 'pillars-of-tech:feedback-visitor:v1\u0000'
const MAX_RESPONSES = 5000

export class FeedbackUnavailableError extends Error {
  constructor() {
    super('Feedback is temporarily unavailable.')
    this.name = 'FeedbackUnavailableError'
  }
}

export class FeedbackNotFoundError extends Error {
  constructor() {
    super('That feedback form is no longer available.')
    this.name = 'FeedbackNotFoundError'
  }
}

export class FeedbackConflictError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'FeedbackConflictError'
  }
}

/** Store only a keyed digest of the device token, never the token itself. */
function hashFeedbackVisitorToken(token: string): string {
  const pepper = process.env.CHAT_TOKEN_PEPPER?.trim()
  if (!pepper || !isValidQnaVisitorToken(token)) throw new FeedbackUnavailableError()
  return createHmac('sha256', pepper).update(FEEDBACK_VISITOR_DOMAIN, 'utf8').update(token, 'utf8').digest('hex')
}

// A whole room may submit at the end of the event from one venue network, so
// the network bucket is generous; the device bucket stops repeated posting.
export async function allowFeedbackSubmission(request: Request, visitorToken: string): Promise<boolean> {
  const [device, network] = await Promise.all([
    consumeChatRateLimit('feedback-device', visitorToken, { windowSeconds: 10 * 60, maxAttempts: 5 }),
    consumeChatRateLimit('feedback-network', getRequestIdentity(request), { windowSeconds: 60, maxAttempts: 100 }),
  ])
  return device && network
}

type FormRow = {
  id: string
  title: string
  intro: string
  collect_contact: boolean
  is_current: boolean
  accepting_responses: boolean
  created_at: string
}

type AdminFormRow = FormRow & {
  feedback_questions: Array<{ count: number }> | null
  feedback_responses: Array<{ count: number }> | null
}

type QuestionRow = {
  id: string
  kind: FeedbackKind
  prompt: string
  required: boolean
  options: unknown
}

type ResponseRow = {
  id: string
  answers: FeedbackAnswers
  respondent_name: string | null
  respondent_email: string | null
  created_at: string
}

const FORM_COLUMNS = 'id, title, intro, collect_contact, is_current, accepting_responses, created_at'
const ADMIN_FORM_COLUMNS = `${FORM_COLUMNS}, feedback_questions(count), feedback_responses(count)`
const QUESTION_COLUMNS = 'id, kind, prompt, required, options'

function client() {
  try {
    return createSupabaseServiceRoleClient()
  } catch {
    throw new FeedbackUnavailableError()
  }
}

function toQuestion(row: QuestionRow): FeedbackQuestion {
  return {
    id: row.id,
    kind: row.kind,
    prompt: row.prompt,
    required: row.required,
    options: Array.isArray(row.options) ? row.options.filter((option): option is string => typeof option === 'string') : [],
  }
}

function toAdminForm(row: AdminFormRow): FeedbackAdminForm {
  return {
    id: row.id,
    title: row.title,
    intro: row.intro,
    collectContact: row.collect_contact,
    acceptingResponses: row.accepting_responses,
    isCurrent: row.is_current,
    createdAt: row.created_at,
    questionCount: row.feedback_questions?.[0]?.count ?? 0,
    responseCount: row.feedback_responses?.[0]?.count ?? 0,
  }
}

async function listQuestions(formId: string): Promise<FeedbackQuestion[]> {
  const { data, error } = await client()
    .from('feedback_questions')
    .select(QUESTION_COLUMNS)
    .eq('form_id', formId)
    .order('position', { ascending: true })
    .returns<QuestionRow[]>()
  if (error) throw new FeedbackUnavailableError()
  return (data ?? []).map(toQuestion)
}

async function getCurrentFormRow(): Promise<FormRow | null> {
  const { data, error } = await client().from('feedback_forms').select(FORM_COLUMNS).eq('is_current', true).maybeSingle<FormRow>()
  if (error) throw new FeedbackUnavailableError()
  return data
}

export async function getPublicFeedbackForm(): Promise<FeedbackPublicForm | null> {
  const form = await getCurrentFormRow()
  if (!form) return null
  return {
    id: form.id,
    title: form.title,
    intro: form.intro,
    collectContact: form.collect_contact,
    acceptingResponses: form.accepting_responses,
    questions: await listQuestions(form.id),
  }
}

export type FeedbackSubmitResult = 'ok' | 'closed' | 'duplicate' | { error: string; questionId?: string }

export async function submitFeedback(input: {
  formId: string
  answers: Record<string, unknown>
  name?: string
  email?: string
  visitorToken: string
}): Promise<FeedbackSubmitResult> {
  const form = await getCurrentFormRow()
  // A form that was ended or swapped while someone was filling it in is closed.
  if (!form || form.id !== input.formId || !form.accepting_responses) return 'closed'

  const validation = validateFeedbackAnswers(await listQuestions(form.id), input, form.collect_contact)
  if (!validation.ok) return { error: validation.error, questionId: validation.questionId }

  const { error } = await client().from('feedback_responses').insert({
    form_id: form.id,
    answers: validation.answers,
    respondent_name: validation.name,
    respondent_email: validation.email,
    visitor_token_digest: hashFeedbackVisitorToken(input.visitorToken),
  })
  if (error?.code === '23505') return 'duplicate'
  if (error) throw new FeedbackUnavailableError()
  return 'ok'
}

// ---------------------------------------------------------------------------
// Host controls (callers must already have verified staff access)
// ---------------------------------------------------------------------------

export async function getAdminFeedbackSnapshot(): Promise<FeedbackAdminSnapshot> {
  const { data, error } = await client()
    .from('feedback_forms')
    .select(ADMIN_FORM_COLUMNS)
    .order('created_at', { ascending: false })
    .limit(200)
    .returns<AdminFormRow[]>()
  if (error) throw new FeedbackUnavailableError()
  const forms = (data ?? []).map(toAdminForm)
  return { forms, currentFormId: forms.find((form) => form.isCurrent)?.id ?? null }
}

/** One form's questions and every response, for the editor and results. */
export async function getFeedbackResults(formId: string): Promise<FeedbackResults> {
  const supabase = client()
  const { data: form, error } = await supabase.from('feedback_forms').select(ADMIN_FORM_COLUMNS).eq('id', formId).maybeSingle<AdminFormRow>()
  if (error) throw new FeedbackUnavailableError()
  if (!form) throw new FeedbackNotFoundError()

  const [questions, responses] = await Promise.all([
    listQuestions(formId),
    supabase
      .from('feedback_responses')
      .select('id, answers, respondent_name, respondent_email, created_at')
      .eq('form_id', formId)
      .order('created_at', { ascending: false })
      .limit(MAX_RESPONSES)
      .returns<ResponseRow[]>(),
  ])
  if (responses.error) throw new FeedbackUnavailableError()

  return {
    form: toAdminForm(form),
    questions,
    responses: (responses.data ?? []).map((row) => ({
      id: row.id,
      answers: row.answers ?? {},
      name: row.respondent_name,
      email: row.respondent_email,
      createdAt: row.created_at,
    })),
  }
}

async function setCurrentForm(formId: string | null): Promise<void> {
  const { error } = await client().rpc('feedback_set_current_form', { p_form_id: formId })
  if (error?.code === 'P0002') throw new FeedbackNotFoundError()
  if (error) throw new FeedbackUnavailableError()
}

export async function replaceFeedbackQuestions(formId: string, questions: FeedbackQuestionInput[]): Promise<void> {
  const { error } = await client().rpc('feedback_replace_questions', {
    p_form_id: formId,
    p_questions: questions.map((question) => ({
      id: question.id ?? null,
      kind: question.kind,
      prompt: question.prompt,
      required: question.required,
      options: question.options,
    })),
  })
  if (error?.code === 'P0002') throw new FeedbackNotFoundError()
  if (error) throw new FeedbackUnavailableError()
}

export async function createFeedbackForm(input: { title: string; useTemplate: boolean; makeCurrent: boolean; createdBy: string }): Promise<string> {
  const { data, error } = await client()
    .from('feedback_forms')
    .insert({
      title: input.title,
      intro: 'Thanks for coming! This takes about two minutes and helps us plan the next event.',
      created_by: input.createdBy,
    })
    .select('id')
    .single<{ id: string }>()
  if (error || !data) throw new FeedbackUnavailableError()
  if (input.useTemplate) await replaceFeedbackQuestions(data.id, CAREER_PANEL_TEMPLATE)
  if (input.makeCurrent) await setCurrentForm(data.id)
  return data.id
}

export async function updateFeedbackForm(input: {
  formId: string
  title?: string
  intro?: string
  collectContact?: boolean
  acceptingResponses?: boolean
  isCurrent?: boolean
}): Promise<void> {
  const patch: Record<string, unknown> = {}
  if (input.title !== undefined) patch.title = input.title
  if (input.intro !== undefined) patch.intro = input.intro
  if (input.collectContact !== undefined) patch.collect_contact = input.collectContact
  if (input.acceptingResponses !== undefined) patch.accepting_responses = input.acceptingResponses

  if (Object.keys(patch).length > 0) {
    const { data, error } = await client().from('feedback_forms').update(patch).eq('id', input.formId).select('id')
    if (error) throw new FeedbackUnavailableError()
    if (!data?.length) throw new FeedbackNotFoundError()
  }

  if (input.isCurrent === true) await setCurrentForm(input.formId)
  if (input.isCurrent === false) {
    const { error } = await client().from('feedback_forms').update({ is_current: false }).eq('id', input.formId)
    if (error) throw new FeedbackUnavailableError()
  }
}

/** Permanently remove an ended form; its questions and responses cascade. */
export async function deleteFeedbackForm(formId: string): Promise<void> {
  const supabase = client()
  const { data, error } = await supabase.from('feedback_forms').select('is_current').eq('id', formId).maybeSingle<{ is_current: boolean }>()
  if (error) throw new FeedbackUnavailableError()
  if (!data) throw new FeedbackNotFoundError()
  if (data.is_current) throw new FeedbackConflictError('End the form before deleting it.')

  const { error: deleteError } = await supabase.from('feedback_forms').delete().eq('id', formId).eq('is_current', false)
  if (deleteError) throw new FeedbackUnavailableError()
}
