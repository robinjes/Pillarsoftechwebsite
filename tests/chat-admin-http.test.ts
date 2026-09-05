import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  requireVerifiedStaffMock,
  listConversationsMock,
  listMessagesMock,
  insertReplyMock,
  terminalMock,
  queueReadMock,
  queueWriteMock,
  deliveryMock,
  configMock,
} = vi.hoisted(() => ({
  requireVerifiedStaffMock: vi.fn(),
  listConversationsMock: vi.fn(),
  listMessagesMock: vi.fn(),
  insertReplyMock: vi.fn(),
  terminalMock: vi.fn(),
  queueReadMock: vi.fn(),
  queueWriteMock: vi.fn(),
  deliveryMock: vi.fn(),
  configMock: vi.fn(),
}))

vi.mock('server-only', () => ({}))
vi.mock('@/lib/auth/server', () => ({ requireVerifiedStaff: requireVerifiedStaffMock }))
vi.mock('@/lib/chat-config', () => ({ getChatServerConfig: configMock }))
vi.mock('@/lib/chat-discord-delivery', () => ({
  deliverChatConversation: deliveryMock,
  dispatchChatDeliveryBatch: deliveryMock,
}))
vi.mock('@/lib/chat-admin-repository', async () => {
  const actual = await vi.importActual<typeof import('@/lib/chat-admin-repository')>('@/lib/chat-admin-repository')
  return {
    ...actual,
    listChatConversationsForStaff: listConversationsMock,
    listChatMessagesForStaff: listMessagesMock,
    insertChatStaffReply: insertReplyMock,
    setChatConversationTerminal: terminalMock,
    getChatQueueStateForStaff: queueReadMock,
    setChatQueueStateForStaff: queueWriteMock,
  }
})

import { GET as listChats, POST as reply } from '@/app/api/admin/chats/route'
import { GET as transcript } from '@/app/api/admin/chats/[id]/messages/route'
import { POST as replyById } from '@/app/api/admin/chats/[id]/reply/route'
import { POST as moderate } from '@/app/api/admin/chats/[id]/moderation/route'
import { POST as retry } from '@/app/api/admin/chats/[id]/retry/route'
import { POST as dispatch } from '@/app/api/admin/chats/dispatch/route'
import { GET as queue, POST as updateQueue } from '@/app/api/admin/chats/queue/route'
import { chatAdminTerminalSchema, chatAdminQueueUpdateSchema } from '@/lib/chat-admin-contracts'
import { readBoundedJson } from '@/lib/chat-admin-http'

const staff = { ok: true as const, isStaff: true as const, user: { id: '00000000-0000-4000-8000-000000000010' } }
const config = {
  enabled: true,
  ready: true,
  credentialReady: true,
  status: 'ready',
  discordApplicationId: '900000000000000010',
  discordPublicKey: 'a'.repeat(64),
  discordBotToken: 'bot-token',
  discordGuildId: '900000000000000011',
  discordChannelId: '900000000000000012',
  discordStaffRoleIds: ['900000000000000015'],
  discordDeliveryReady: true,
}

beforeEach(() => {
  vi.clearAllMocks()
  requireVerifiedStaffMock.mockResolvedValue(staff)
  configMock.mockReturnValue(config)
  insertReplyMock.mockResolvedValue({ conversationId: '00000000-0000-4000-8000-000000000001' })
  listConversationsMock.mockResolvedValue({ conversations: [], nextCursor: null })
  listMessagesMock.mockResolvedValue({ messages: [], nextCursor: null })
  queueReadMock.mockResolvedValue({ queue: {} })
  queueWriteMock.mockResolvedValue({ id: '00000000-0000-4000-8000-000000000001' })
  deliveryMock.mockResolvedValue({ status: 'sent' })
})

describe('protected staff chat HTTP routes', () => {
  it('uses strict list params and preserves no-store on reads', async () => {
    const response = await listChats(new Request('https://pillarsoftech.org/api/admin/chats?limit=10'))
    expect(response.status, await response.text()).toBe(200)
    expect(response.headers.get('cache-control')).toContain('no-store')
    expect(listConversationsMock).toHaveBeenCalledWith(expect.objectContaining({ limit: 10 }))

    const unknown = await listChats(new Request('https://pillarsoftech.org/api/admin/chats?unexpected=true'))
    expect(unknown.status).toBe(400)

    const prototypeKey = await listChats(new Request('https://pillarsoftech.org/api/admin/chats?__proto__=unexpected'))
    expect(prototypeKey.status).toBe(400)
  })

  it('rejects cross-origin and server-only fields before staff mutation', async () => {
    const crossOrigin = await reply(new Request('https://pillarsoftech.org/api/admin/chats', {
      method: 'POST',
      headers: { origin: 'https://evil.example', 'content-type': 'application/json' },
      body: JSON.stringify({
        conversationId: '00000000-0000-4000-8000-000000000001',
        staffMessageId: '00000000-0000-4000-8000-000000000002',
        body: 'Reply',
      }),
    }))
    expect(crossOrigin.status).toBe(403)
    expect(insertReplyMock).not.toHaveBeenCalled()

    const forged = await reply(new Request('https://pillarsoftech.org/api/admin/chats', {
      method: 'POST',
      headers: { origin: 'https://pillarsoftech.org', 'content-type': 'application/json' },
      body: JSON.stringify({
        conversationId: '00000000-0000-4000-8000-000000000001',
        staffMessageId: '00000000-0000-4000-8000-000000000002',
        body: 'Reply',
        discordActorId: '900000000000000014',
      }),
    }))
    expect(forged.status).toBe(400)
    expect(insertReplyMock).not.toHaveBeenCalled()
  })

  it('requires same-origin moderation and strict transcript cursors', async () => {
    expect(chatAdminTerminalSchema.safeParse({ conversationId: '00000000-0000-4000-8000-000000000001', status: 'closed', actionId: 'close-1' }).success).toBe(true)
    expect(await readBoundedJson(new Request('https://pillarsoftech.org/api/admin/chats/x/moderation', { method: 'POST', body: JSON.stringify({ status: 'closed', actionId: 'close-1' }) }))).toEqual({ status: 'closed', actionId: 'close-1' })
    const response = await moderate(new Request('https://pillarsoftech.org/api/admin/chats/00000000-0000-4000-8000-000000000001/moderation', {
      method: 'POST',
      headers: { origin: 'https://pillarsoftech.org', 'content-type': 'application/json' },
      body: JSON.stringify({ status: 'closed', actionId: 'close-1' }),
    }), { params: Promise.resolve({ id: '00000000-0000-4000-8000-000000000001' }) })
    expect(response.status).toBe(200)
    expect(terminalMock).toHaveBeenCalledWith(expect.objectContaining({ status: 'closed' }), staff.user.id)

    const duplicate = await transcript(new Request('https://pillarsoftech.org/api/admin/chats/x/messages?limit=1&limit=2'), {
      params: Promise.resolve({ id: '00000000-0000-4000-8000-000000000001' }),
    })
    expect(duplicate.status).toBe(400)
    expect(listMessagesMock).not.toHaveBeenCalled()
  })

  it('allows staff reads while chat is disabled but blocks queue opening', async () => {
    expect(chatAdminQueueUpdateSchema.safeParse({ queueOpen: true, actionId: 'open-1' }).success).toBe(true)
    expect(await readBoundedJson(new Request('https://pillarsoftech.org/api/admin/chats/queue', { method: 'POST', body: JSON.stringify({ queueOpen: true, actionId: 'open-1' }) }))).toEqual({ queueOpen: true, actionId: 'open-1' })
    const read = await queue()
    expect(read.status).toBe(200)

    configMock.mockReturnValue({ ...config, enabled: false, ready: false, status: 'disabled' })
    const open = await updateQueue(new Request('https://pillarsoftech.org/api/admin/chats/queue', {
      method: 'POST',
      headers: { origin: 'https://pillarsoftech.org', 'content-type': 'application/json' },
      body: JSON.stringify({ queueOpen: true, actionId: 'open-1' }),
    }))
    expect(open.status, await open.text()).toBe(409)
    expect(queueWriteMock).not.toHaveBeenCalled()
  })

  it('rejects unauthenticated and nonstaff callers across every staff route handler', async () => {
    const params = { params: Promise.resolve({ id: '00000000-0000-4000-8000-000000000001' }) }
    const calls = [
      () => listChats(new Request('https://pillarsoftech.org/api/admin/chats')),
      () => reply(new Request('https://pillarsoftech.org/api/admin/chats', { method: 'POST', body: '{}' })),
      () => transcript(new Request('https://pillarsoftech.org/api/admin/chats/x/messages'), params),
      () => replyById(new Request('https://pillarsoftech.org/api/admin/chats/x/reply', { method: 'POST', body: '{}' }), params),
      () => moderate(new Request('https://pillarsoftech.org/api/admin/chats/x/moderation', { method: 'POST', body: '{}' }), params),
      () => retry(new Request('https://pillarsoftech.org/api/admin/chats/x/retry', { method: 'POST', body: '{}' }), params),
      () => queue(),
      () => updateQueue(new Request('https://pillarsoftech.org/api/admin/chats/queue', { method: 'POST', body: '{}' })),
      () => dispatch(new Request('https://pillarsoftech.org/api/admin/chats/dispatch', { method: 'POST', body: '{}' })),
    ]

    for (const failure of [
      { ok: false as const, code: 'unauthenticated' as const, status: 401 as const, message: 'sign in' },
      { ok: false as const, code: 'not_staff' as const, status: 403 as const, message: 'staff only' },
    ]) {
      requireVerifiedStaffMock.mockResolvedValue(failure)
      const responses = await Promise.all(calls.map((call) => call()))
      expect(responses.map((response) => response.status)).toEqual(calls.map(() => failure.status))
    }

    expect(listConversationsMock).not.toHaveBeenCalled()
    expect(listMessagesMock).not.toHaveBeenCalled()
    expect(insertReplyMock).not.toHaveBeenCalled()
    expect(terminalMock).not.toHaveBeenCalled()
    expect(queueReadMock).not.toHaveBeenCalled()
    expect(queueWriteMock).not.toHaveBeenCalled()
    expect(deliveryMock).not.toHaveBeenCalled()
  })
})
