import { z } from 'zod'

export const CHAT_TIME_ZONE = 'America/Los_Angeles'
export const CHAT_MAX_DISPLAY_NAME = 160
export const CHAT_MAX_EMAIL = 320
export const MAX_CHAT_MESSAGE = 4_000
export const CHAT_MAX_HONEYPOT = 100
export const CHAT_MAX_PAGE_SIZE = 50
export const CHAT_TOKEN_TTL_SECONDS = 30 * 24 * 60 * 60
export const CHAT_TOKEN_COOKIE = 'pot_chat_token'
export const CHAT_REQUEST_NONCE_BYTES = 32
export const CHAT_REQUEST_NONCE_LENGTH = 43
export const CHAT_CANONICAL_DAYS = 'Monday–Friday'
export const CHAT_CANONICAL_OPENS_AT = '16:00'
export const CHAT_CANONICAL_CLOSES_AT = '22:00'
export const CHAT_CANONICAL_LABEL = 'Monday–Friday, 4:00–10:00 PM Pacific'
export const CHAT_UNDER_13_ERROR = 'under_13_requires_guardian'
export const CHAT_MESSAGE_ID_CONFLICT_ERROR = 'message_id_conflict'

const controlCharacters = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u
const markupCharacters = /[<>]/u
const base64urlNonce = new RegExp(`^[A-Za-z0-9_-]{${CHAT_REQUEST_NONCE_LENGTH}}$`, 'u')

/**
 * Chat is deliberately text-only. Reject control characters and angle
 * brackets at the input boundary so callers cannot smuggle HTML, XML, or
 * script-like markup into a transcript. Unicode letters and ordinary
 * punctuation remain valid.
 */
export function isPlainChatText(value: string): boolean {
  return !controlCharacters.test(value) && !markupCharacters.test(value)
}

export function isValidChatRequestNonce(value: unknown): value is string {
  return typeof value === 'string' && base64urlNonce.test(value)
}

const plainChatText = (max: number) => z
  .string()
  .trim()
  .min(1)
  .max(max)
  .refine(isPlainChatText, 'Use plain text without markup or control characters.')

const optionalChatEmail = z.union([z.email().max(CHAT_MAX_EMAIL), z.literal('')]).default('')

export const chatConversationCreateSchema = z.object({
  displayName: plainChatText(CHAT_MAX_DISPLAY_NAME),
  email: optionalChatEmail,
  isUnder13: z.boolean(),
  guardianAttested: z.boolean(),
  requestNonce: z.string().refine(isValidChatRequestNonce, 'Use one 32-byte base64url request nonce.'),
  honeypot: z.string().trim().max(CHAT_MAX_HONEYPOT).default(''),
}).strict().superRefine((payload, context) => {
  if (payload.isUnder13 && !payload.guardianAttested) {
    context.addIssue({
      code: 'custom',
      path: ['guardianAttested'],
      message: 'A parent or guardian must attest before under-13 chat.',
    })
  }
  if (payload.honeypot !== '') {
    context.addIssue({ code: 'custom', path: ['honeypot'], message: 'Invalid submission.' })
  }
})

export type ChatConversationCreate = z.infer<typeof chatConversationCreateSchema>

export const chatMessageCreateSchema = z.object({
  conversationId: z.uuid(),
  clientMessageId: z.uuid(),
  body: plainChatText(MAX_CHAT_MESSAGE),
  honeypot: z.string().trim().max(CHAT_MAX_HONEYPOT).default(''),
}).strict().superRefine((payload, context) => {
  if (payload.honeypot !== '') {
    context.addIssue({ code: 'custom', path: ['honeypot'], message: 'Invalid submission.' })
  }
})

export type ChatMessageCreate = z.infer<typeof chatMessageCreateSchema>

export const chatConversationStatusSchema = z.enum(['open', 'closed', 'spam'])
export type ChatConversationStatus = z.infer<typeof chatConversationStatusSchema>

export const chatMessageSenderSchema = z.enum(['visitor', 'staff', 'system'])
export type ChatMessageSender = z.infer<typeof chatMessageSenderSchema>

export const chatDeliveryStatusSchema = z.enum(['pending', 'sent', 'failed'])
export type ChatDeliveryStatus = z.infer<typeof chatDeliveryStatusSchema>

const isoDateTimeWithTimezone = z.string().trim().refine(
  (value) => /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(value)
    && Number.isFinite(Date.parse(value)),
  'Use an ISO date-time with a timezone.',
)

export const chatCursorPayloadSchema = z.object({
  createdAt: isoDateTimeWithTimezone,
  id: z.uuid(),
}).strict()

export type ChatCursorPayload = z.infer<typeof chatCursorPayloadSchema>

export const chatOfficeHourSchema = z.object({
  id: z.uuid(),
  weekday: z.number().int().min(1).max(7),
  openTime: z.string().regex(/^\d{2}:\d{2}$/),
  closeTime: z.string().regex(/^\d{2}:\d{2}$/),
  timezone: z.string().trim().min(1).max(80),
  enabled: z.boolean(),
}).strict()

export type ChatOfficeHour = z.infer<typeof chatOfficeHourSchema>

export const chatQueueStateSchema = z.object({
  id: z.uuid(),
  queueOpen: z.boolean(),
  queueExpiresAt: isoDateTimeWithTimezone.nullable(),
  updatedAt: isoDateTimeWithTimezone,
}).strict()

export type ChatQueueState = z.infer<typeof chatQueueStateSchema>

export const chatConversationRecordSchema = z.object({
  id: z.uuid(),
  displayName: plainChatText(CHAT_MAX_DISPLAY_NAME),
  email: optionalChatEmail,
  status: chatConversationStatusSchema,
  ownershipExpiresAt: isoDateTimeWithTimezone,
  terminalAt: isoDateTimeWithTimezone.nullable(),
  discordThreadId: z.string().regex(/^\d{1,30}$/).nullable(),
  discordStarterMessageId: z.string().regex(/^\d{1,30}$/).nullable(),
  discordDeliveryStatus: chatDeliveryStatusSchema,
  createdAt: isoDateTimeWithTimezone,
  updatedAt: isoDateTimeWithTimezone,
}).strict()

export type ChatConversationRecord = z.infer<typeof chatConversationRecordSchema>

export const chatMessageRecordSchema = z.object({
  id: z.uuid(),
  conversationId: z.uuid(),
  clientMessageId: z.uuid().nullable(),
  sender: chatMessageSenderSchema,
  body: plainChatText(MAX_CHAT_MESSAGE),
  deliveryStatus: chatDeliveryStatusSchema,
  createdAt: isoDateTimeWithTimezone,
}).strict()

export type ChatMessageRecord = z.infer<typeof chatMessageRecordSchema>

export const chatAvailabilityStateSchema = z.enum(['open', 'scheduled_offline', 'closed'])
export type ChatAvailabilityState = z.infer<typeof chatAvailabilityStateSchema>

export const chatAvailabilitySchema = z.object({
  state: chatAvailabilityStateSchema,
  queueOpen: z.boolean(),
  timezone: z.literal(CHAT_TIME_ZONE),
  nextOpening: isoDateTimeWithTimezone.nullable(),
  days: z.literal(CHAT_CANONICAL_DAYS),
  opensAt: z.literal(CHAT_CANONICAL_OPENS_AT),
  closesAt: z.literal(CHAT_CANONICAL_CLOSES_AT),
  label: z.literal(CHAT_CANONICAL_LABEL),
}).strict()

export type ChatAvailability = z.infer<typeof chatAvailabilitySchema>
