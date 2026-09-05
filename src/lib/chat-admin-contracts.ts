import { z } from 'zod'

import {
  CHAT_MAX_DISPLAY_NAME,
  CHAT_MAX_EMAIL,
  CHAT_MAX_PAGE_SIZE,
  MAX_CHAT_MESSAGE,
  chatConversationStatusSchema,
  chatDeliveryStatusSchema,
  isPlainChatText,
  type ChatConversationStatus,
} from '@/lib/chat-contracts'

const uuid = z.uuid()
const snowflake = z.string().regex(/^\d{1,30}$/u, 'Use a Discord snowflake.')
const interactionId = z.string().regex(/^[A-Za-z0-9_-]{1,80}$/u, 'Use a bounded interaction id.')
const adminText = (max: number) => z.string().trim().min(1).max(max).refine(isPlainChatText)
const optionalCursor = z.string().trim().min(1).max(256).nullable().optional()

export const chatAdminConversationListSchema = z.object({
  status: chatConversationStatusSchema.optional(),
  search: z.string().trim().max(CHAT_MAX_DISPLAY_NAME).refine(isPlainChatText).regex(/^[\p{L}\p{N}\s.@_+'’\-]+$/u).optional(),
  cursor: optionalCursor,
  limit: z.coerce.number().int().min(1).max(CHAT_MAX_PAGE_SIZE).default(CHAT_MAX_PAGE_SIZE),
}).strict()

export type ChatAdminConversationListInput = z.infer<typeof chatAdminConversationListSchema>

export const chatAdminConversationSchema = z.object({
  id: uuid,
  displayName: adminText(CHAT_MAX_DISPLAY_NAME),
  email: z.union([z.email().max(CHAT_MAX_EMAIL), z.literal('')]),
  isUnder13: z.boolean(),
  guardianAttested: z.boolean(),
  status: chatConversationStatusSchema,
  ownershipExpiresAt: z.string().datetime({ offset: true }),
  terminalAt: z.string().datetime({ offset: true }).nullable(),
  discordThreadId: snowflake.nullable(),
  discordStarterMessageId: snowflake.nullable(),
  discordDeliveryStatus: chatDeliveryStatusSchema,
  createdAt: z.string().datetime({ offset: true }),
  updatedAt: z.string().datetime({ offset: true }),
}).strict()

export type ChatAdminConversation = z.infer<typeof chatAdminConversationSchema>

/**
 * Browser transcript DTOs deliberately omit the private actor and Discord
 * source fields.  The service repository parses those columns separately and
 * only returns this projection to an authenticated dashboard.
 */
export const chatAdminMessageSchema = z.object({
  id: uuid,
  conversationId: uuid,
  sender: z.enum(['visitor', 'staff', 'system']),
  body: adminText(MAX_CHAT_MESSAGE),
  deliveryStatus: chatDeliveryStatusSchema,
  createdAt: z.string().datetime({ offset: true }),
}).strict()

export type ChatAdminMessage = z.infer<typeof chatAdminMessageSchema>

/** Server-only storage projection; never parse browser input with this. */
export const chatAdminStoredMessageSchema = z.object({
  id: uuid,
  conversationId: uuid,
  clientMessageId: uuid.nullable(),
  staffMessageId: uuid.nullable(),
  authorUserId: uuid.nullable(),
  sender: z.enum(['visitor', 'staff', 'system']),
  body: adminText(MAX_CHAT_MESSAGE),
  deliveryStatus: chatDeliveryStatusSchema,
  sourceInteractionId: interactionId.nullable(),
  createdAt: z.string().datetime({ offset: true }),
}).strict()

export const chatAdminReplySchema = z.object({
  conversationId: uuid,
  staffMessageId: uuid,
  body: adminText(MAX_CHAT_MESSAGE),
}).strict()

export type ChatAdminReplyInput = z.infer<typeof chatAdminReplySchema>

export const chatAdminTerminalSchema = z.object({
  conversationId: uuid,
  status: z.enum(['closed', 'spam']),
  actionId: interactionId,
}).strict()

export type ChatAdminTerminalInput = z.infer<typeof chatAdminTerminalSchema>

export const chatAdminQueueUpdateSchema = z.object({
  queueOpen: z.boolean(),
  actionId: interactionId,
}).strict()

export type ChatAdminQueueUpdateInput = z.infer<typeof chatAdminQueueUpdateSchema>

/**
 * Discord-only context is supplied after a signed interaction has been
 * authenticated.  It is intentionally not part of the browser schemas.
 */
export const chatDiscordActionContextSchema = z.object({
  sourceInteractionId: interactionId.nullable().optional().default(null),
  discordActorId: snowflake.nullable().optional().default(null),
}).strict()

export type ChatDiscordActionContext = z.input<typeof chatDiscordActionContextSchema>

export const chatAdminQueueStateSchema = z.object({
  id: uuid,
  queueOpen: z.boolean(),
  queueExpiresAt: z.string().datetime({ offset: true }).nullable(),
  updatedAt: z.string().datetime({ offset: true }),
}).strict()

export type ChatAdminQueueState = z.infer<typeof chatAdminQueueStateSchema>

export const chatAdminPageSchema = z.object({
  conversations: z.array(chatAdminConversationSchema),
  nextCursor: z.string().nullable(),
}).strict()

export type ChatAdminConversationPage = z.infer<typeof chatAdminPageSchema>

export const chatAdminTranscriptPageSchema = z.object({
  messages: z.array(chatAdminMessageSchema),
  nextCursor: z.string().nullable(),
}).strict()

export type ChatAdminTranscriptPage = z.infer<typeof chatAdminTranscriptPageSchema>

// Keep these names available to routes and bridge code without duplicating
// schemas or allowing loose object parsing.
export const chatAdminConversationFilterSchema = chatAdminConversationListSchema
export type ChatAdminConversationFilter = ChatAdminConversationListInput
export type ChatAdminTerminalStatus = Extract<ChatConversationStatus, 'closed' | 'spam'>
