import { beforeEach, describe, expect, it, vi } from 'vitest'

const { createSupabaseServiceRoleClientMock } = vi.hoisted(() => ({
  createSupabaseServiceRoleClientMock: vi.fn(),
}))

vi.mock('server-only', () => ({}))
vi.mock('@/lib/supabase/service', () => ({ createSupabaseServiceRoleClient: createSupabaseServiceRoleClientMock }))

import {
  createChatConversation,
  getChatConversationForVisitor,
  insertChatMessageForVisitor,
  listChatMessagesForVisitor,
  getStoredChatAvailability,
} from '@/lib/chat-repository'
import { decodeChatCursor, encodeChatCursor } from '@/lib/chat-pagination'

const digest = 'a'.repeat(64)
const conversationId = '00000000-0000-4000-8000-000000000001'
const row = {
  id: conversationId,
  display_name: 'Ada Lovelace',
  email: 'ada@example.com',
  status: 'open',
  ownership_expires_at: '2026-09-25T12:00:00.000Z',
  terminal_at: null,
  discord_thread_id: null,
  discord_delivery_status: 'pending',
  created_at: '2026-08-26T12:00:00.000Z',
  updated_at: '2026-08-26T12:00:00.000Z',
}

function builder(data: unknown, error: unknown = null) {
  const value = {
    select: vi.fn(),
    eq: vi.fn(),
    order: vi.fn(),
    limit: vi.fn(),
    or: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    single: vi.fn(),
    maybeSingle: vi.fn(),
    then: undefined as unknown,
  }
  for (const key of ['select', 'eq', 'order', 'limit', 'or', 'insert', 'update'] as const) value[key].mockReturnValue(value)
  value.maybeSingle.mockResolvedValue({ data, error })
  value.single.mockResolvedValue({ data, error })
  value.then = ((resolve: (value: unknown) => unknown, reject?: (reason: unknown) => unknown) => Promise.resolve({ data, error }).then(resolve, reject)) as unknown as undefined
  return value
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubEnv('CHAT_TOKEN_PEPPER', 'test-pepper')
})

describe('chat repository ownership boundaries', () => {
  it('uses the keyed digest and conversation id together, never a client token', async () => {
    const query = builder(row)
    createSupabaseServiceRoleClientMock.mockReturnValue({ from: vi.fn().mockReturnValue(query) })
    const result = await getChatConversationForVisitor(digest, conversationId, new Date('2026-08-26T13:00:00.000Z'))
    expect(result?.id).toBe(conversationId)
    expect(query.eq).toHaveBeenNthCalledWith(1, 'visitor_token_digest', digest)
    expect(query.eq).toHaveBeenNthCalledWith(2, 'id', conversationId)
    expect(JSON.stringify(query)).not.toContain('Ada Lovelace')
  })

  it('fails closed for expired owner rows and keeps A/B cursors isolated', async () => {
    const expiredQuery = builder({ ...row, ownership_expires_at: '2026-08-26T12:00:00.000Z' })
    createSupabaseServiceRoleClientMock.mockReturnValue({ from: vi.fn().mockReturnValue(expiredQuery) })
    await expect(getChatConversationForVisitor(digest, conversationId, new Date('2026-08-26T12:00:00.001Z'))).resolves.toBeNull()

    const ownerQuery = builder(row)
    const messageQuery = builder([
      { id: '00000000-0000-4000-8000-000000000002', conversation_id: conversationId, sender: 'visitor', body: 'A question?', delivery_status: 'pending', created_at: '2026-08-26T12:01:00.000Z' },
      { id: '00000000-0000-4000-8000-000000000003', conversation_id: conversationId, sender: 'staff', body: 'A reply.', delivery_status: 'sent', created_at: '2026-08-26T12:02:00.000Z' },
    ])
    const fromForMessages = vi.fn()
      .mockReturnValueOnce(ownerQuery)
      .mockReturnValueOnce(messageQuery)
    createSupabaseServiceRoleClientMock.mockReturnValue({ from: fromForMessages })
    const page = await listChatMessagesForVisitor({ id: conversationId }, digest, decodeChatCursor(encodeChatCursor('2026-08-26T12:00:00.000Z', '00000000-0000-4000-8000-000000000001')), 1)
    expect(page.messages).toHaveLength(1)
    expect(page.nextCursor).toBeTruthy()
    expect(messageQuery.eq).toHaveBeenCalledWith('conversation_id', conversationId)
    expect(messageQuery.or).toHaveBeenCalledWith('created_at.gt.2026-08-26T12:00:00.000Z,and(created_at.eq.2026-08-26T12:00:00.000Z,id.gt.00000000-0000-4000-8000-000000000001)')
  })

  it('stores only the keyed owner digest and leaves visitor delivery pending', async () => {
    const existingQuery = builder(null)
    const insertedConversation = builder(row)
    const messageOwnerQuery = builder(row)
    const insertedMessage = {
      id: '00000000-0000-4000-8000-000000000004',
      conversation_id: conversationId,
      sender: 'visitor',
      body: 'A punctuation-rich question?!',
      delivery_status: 'pending',
      created_at: '2026-08-26T12:03:00.000Z',
    }
    const from = vi.fn()
      .mockReturnValueOnce(existingQuery)
      .mockReturnValueOnce(insertedConversation)
      .mockReturnValueOnce(messageOwnerQuery)
    const rpc = vi.fn().mockResolvedValue({ data: insertedMessage, error: null })
    createSupabaseServiceRoleClientMock.mockReturnValue({ from, rpc })
    const created = await createChatConversation({
      displayName: 'Ada Lovelace',
      email: 'ada@example.com',
      isUnder13: false,
      guardianAttested: false,
      requestNonce: 'A'.repeat(43),
      honeypot: '',
    }, digest, new Date('2026-08-26T12:00:00.000Z'))
    expect(created.resumed).toBe(false)
    expect(insertedConversation.insert).toHaveBeenCalledWith(expect.objectContaining({
      visitor_token_digest: digest,
      display_name: 'Ada Lovelace',
      email: 'ada@example.com',
      discord_delivery_status: 'pending',
    }))
    expect(insertedConversation.insert.mock.calls[0][0]).not.toHaveProperty('requestNonce')
    const message = await insertChatMessageForVisitor(created.conversation, digest, 'A punctuation-rich question?!')
    expect(message.deliveryStatus).toBe('pending')
    expect(rpc).toHaveBeenCalledWith('insert_chat_visitor_message', {
      p_conversation_id: conversationId,
      p_visitor_token_digest: digest,
      p_body: 'A punctuation-rich question?!',
    })
  })

  it('recovers a unique digest race by resuming the matching open conversation', async () => {
    const initialLookup = builder(null)
    const conflictingInsert = builder(null, { code: '23505', details: 'digest conflict' })
    const recoveryLookup = builder(row)
    const from = vi.fn()
      .mockReturnValueOnce(initialLookup)
      .mockReturnValueOnce(conflictingInsert)
      .mockReturnValueOnce(recoveryLookup)
    createSupabaseServiceRoleClientMock.mockReturnValue({ from })
    const result = await createChatConversation({
      displayName: 'Ada Lovelace',
      email: 'ada@example.com',
      isUnder13: false,
      guardianAttested: false,
      requestNonce: 'A'.repeat(43),
      honeypot: '',
    }, digest, new Date('2026-08-26T12:00:00.000Z'))
    expect(result).toEqual({ conversation: expect.objectContaining({ id: conversationId }), resumed: true })
  })

  it('allows an unexpired owner to read a closed transcript but rejects spam', async () => {
    const closedOwnerQuery = builder({ ...row, status: 'closed', terminal_at: '2026-08-26T13:00:00.000Z' })
    const messageQuery = builder([{
      id: '00000000-0000-4000-8000-000000000004',
      conversation_id: conversationId,
      sender: 'staff',
      body: 'Final staff reply.',
      delivery_status: 'sent',
      created_at: '2026-08-26T13:00:00.000Z',
    }])
    const from = vi.fn().mockReturnValueOnce(closedOwnerQuery).mockReturnValueOnce(messageQuery)
    createSupabaseServiceRoleClientMock.mockReturnValue({ from })
    const result = await listChatMessagesForVisitor({ id: conversationId }, digest)
    expect(result.messages[0]?.body).toBe('Final staff reply.')

    const spamOwnerQuery = builder({ ...row, status: 'spam', terminal_at: '2026-08-26T13:00:00.000Z' })
    createSupabaseServiceRoleClientMock.mockReturnValue({ from: vi.fn().mockReturnValue(spamOwnerQuery) })
    await expect(listChatMessagesForVisitor({ id: conversationId }, digest)).rejects.toMatchObject({
      status: 404,
      routeCode: 'conversation_not_found',
    })
  })

  it('maps atomic RPC close and ownership states to redacted repository errors', async () => {
    const ownerQuery = builder(row)
    const from = vi.fn().mockReturnValue(ownerQuery)
    const rpc = vi.fn().mockResolvedValue({ data: null, error: { code: 'P0003', message: 'private queue state' } })
    createSupabaseServiceRoleClientMock.mockReturnValue({ from, rpc })
    await expect(insertChatMessageForVisitor({ id: conversationId }, digest, 'A message.')).rejects.toMatchObject({
      status: 409,
      routeCode: 'chat_closed',
      message: 'Chat conversation is closed.',
    })

    const notFoundRpc = vi.fn().mockResolvedValue({ data: null, error: { code: 'P0002', message: 'private digest detail' } })
    createSupabaseServiceRoleClientMock.mockReturnValue({ from: vi.fn().mockReturnValue(builder(row)), rpc: notFoundRpc })
    await expect(insertChatMessageForVisitor({ id: conversationId }, digest, 'A message.')).rejects.toMatchObject({
      status: 404,
      routeCode: 'conversation_not_found',
      message: 'Chat conversation was not found.',
    })
  })
})

describe('stored availability repository', () => {
  it('fails closed when any schedule row is malformed', async () => {
    const scheduleQuery = builder([{ id: '10000000-0000-4000-8000-000000000001', weekday: 1, open_time: 'not-a-time', close_time: '22:00', timezone: 'America/Los_Angeles', enabled: true }])
    const queueQuery = builder({ id: '20000000-0000-4000-8000-000000000001', queue_open: true, updated_at: '2026-08-26T12:00:00.000Z' })
    const from = vi.fn()
      .mockReturnValueOnce(scheduleQuery)
      .mockReturnValueOnce(queueQuery)
    createSupabaseServiceRoleClientMock.mockReturnValue({ from })
    const result = await getStoredChatAvailability(new Date('2026-08-26T23:00:00.000Z'))
    expect(result.state).toBe('closed')
    expect(result.queueOpen).toBe(false)
  })
})
