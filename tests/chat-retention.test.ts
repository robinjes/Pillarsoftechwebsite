import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

import {
  authorizeChatRetentionRequest,
  CHAT_RETENTION_BATCH_SIZE,
  runChatRetention,
} from '@/lib/chat-retention'
import type { ChatServerConfig } from '@/lib/chat-config'
import type { ChatCleanupJob } from '@/lib/chat-delivery-contracts'

const secret = 'retention-secret-012345678901234567890'
const guildId = '900000000000000011'
const channelId = '900000000000000012'
const jobId = '00000000-0000-4000-8000-000000000001'
const conversationId = '00000000-0000-4000-8000-000000000002'
const claimToken = '00000000-0000-4000-8000-000000000003'
const fixedNow = new Date('2026-09-05T12:00:00.000Z')

const config: ChatServerConfig = {
  enabled: false,
  ready: false,
  credentialReady: false,
  retentionReady: true,
  discordDeliveryReady: false,
  status: 'disabled',
  discordApplicationId: null,
  discordPublicKey: null,
  discordBotToken: null,
  discordGuildId: guildId,
  discordChannelId: channelId,
  discordStaffRoleIds: [],
}

function cleanupJob(state: ChatCleanupJob['state'] = 'pending'): ChatCleanupJob {
  return {
    id: jobId,
    conversationId,
    guildId,
    parentChannelId: channelId,
    starterMessageId: '900000000000000013',
    threadId: '900000000000000013',
    state,
    claimToken: state === 'claimed' ? claimToken : null,
    leaseExpiresAt: state === 'claimed' ? '2026-09-05T12:01:00.000Z' : null,
    attemptCount: 0,
    failureCode: null,
    nextRetryAt: null,
    createdAt: '2026-09-01T12:00:00.000Z',
    updatedAt: '2026-09-01T12:00:00.000Z',
    completedAt: null,
  }
}

function request(authorization?: string): Request {
  return new Request('https://pillarsoftech.org/api/cron/chat-retention', {
    headers: authorization ? { authorization } : undefined,
  })
}

describe('protected chat retention authorization', () => {
  it('fails closed for absent, short, malformed, and mismatched secrets', () => {
    expect(authorizeChatRetentionRequest(request(), null)).toBe('missing_secret')
    expect(authorizeChatRetentionRequest(request('Bearer short'), 'too-short')).toBe('missing_secret')
    expect(authorizeChatRetentionRequest(request('Basic secret'), secret)).toBe('invalid')
    expect(authorizeChatRetentionRequest(request('Bearer wrong-secret'), secret)).toBe('invalid')
  })

  it('accepts only the exact configured bearer secret', () => {
    expect(authorizeChatRetentionRequest(request(`Bearer ${secret}`), secret)).toBe('authorized')
    expect(authorizeChatRetentionRequest(request(`bearer ${secret}`), secret)).toBe('invalid')
    expect(authorizeChatRetentionRequest(request(`Bearer  ${secret}`), secret)).toBe('invalid')
  })
})

describe('bounded chat retention runner', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('forwards the 30-day cutoff and processes only a bounded batch', async () => {
    const prepare = vi.fn(async (input: { cutoff: string; limit: number }) => {
      expect(input.cutoff).toBe('2026-08-06T12:00:00.000Z')
      expect(input.limit).toBe(2)
      return []
    })
    const list = vi.fn(async (limit = 2) => {
      expect(limit).toBe(2)
      return [cleanupJob(), { ...cleanupJob(), id: '00000000-0000-4000-8000-000000000004' }, { ...cleanupJob(), id: '00000000-0000-4000-8000-000000000005' }]
    })
    const claim = vi.fn(async (_id: string, token: string) => ({ ...cleanupJob('claimed'), claimToken: token }))
    const cleanup = vi.fn(async () => ({
      jobId,
      state: 'succeeded' as const,
      threadDeleted: true,
      starterDeleted: true,
      failureCode: null,
      nextRetryAt: null,
    }))

    const result = await runChatRetention({
      config,
      now: () => fixedNow,
      clock: () => 0,
      batchSize: 2,
      maxRuntimeMs: 10,
      repository: {
        prepareChatRetentionCleanup: prepare,
        listChatCleanupJobs: list,
        claimChatCleanupJob: claim,
        claimUncertainChatCleanupJob: vi.fn(),
        finishChatCleanupJob: vi.fn(),
      },
      cleanup,
    })

    expect(result).toMatchObject({ prepared: 0, candidates: 2, attempted: 2, succeeded: 2 })
    expect(prepare).toHaveBeenCalledWith({
      guildId,
      parentChannelId: channelId,
      cutoff: '2026-08-06T12:00:00.000Z',
      limit: 2,
    })
    expect(list).toHaveBeenCalledWith(2)
  })

  it('stops before starting cleanup after the wall-clock budget', async () => {
    let clockCalls = 0
    const cleanup = vi.fn(async () => ({
      jobId,
      state: 'succeeded' as const,
      threadDeleted: false,
      starterDeleted: false,
      failureCode: null,
      nextRetryAt: null,
    }))
    const result = await runChatRetention({
      config,
      now: () => fixedNow,
      clock: () => {
        clockCalls += 1
        return clockCalls >= 5 ? 10 : 0
      },
      maxRuntimeMs: 10,
      batchSize: 2,
      repository: {
        prepareChatRetentionCleanup: vi.fn(async () => []),
        listChatCleanupJobs: vi.fn(async () => [cleanupJob(), { ...cleanupJob(), id: '00000000-0000-4000-8000-000000000004' }]),
        claimChatCleanupJob: vi.fn(async (_id: string, token: string) => ({ ...cleanupJob('claimed'), claimToken: token })),
        claimUncertainChatCleanupJob: vi.fn(),
        finishChatCleanupJob: vi.fn(),
      },
      cleanup,
    })

    expect(result.bounded).toBe(true)
    expect(result.attempted).toBe(1)
    expect(cleanup).toHaveBeenCalledTimes(1)
  })

  it('does not hide preparation failure when it consumes the remaining budget', async () => {
    let clockCalls = 0
    const result = await runChatRetention({
      config,
      now: () => fixedNow,
      clock: () => {
        clockCalls += 1
        return clockCalls === 1 ? 0 : 10
      },
      maxRuntimeMs: 10,
      repository: {
        prepareChatRetentionCleanup: vi.fn(async () => { throw new Error('storage unavailable') }),
        listChatCleanupJobs: vi.fn(async () => []),
        claimChatCleanupJob: vi.fn(),
        claimUncertainChatCleanupJob: vi.fn(),
        finishChatCleanupJob: vi.fn(),
      },
    })

    expect(result).toMatchObject({ bounded: true, errorCode: 'chat_unavailable' })
  })

  it('keeps an external cleanup failure retryable and reports it', async () => {
    const finish = vi.fn(async (_id: string, _token: string, input: { outcome: string; nextRetryAt?: string | null }) => {
      expect(input.outcome).toBe('failed')
      expect(input.nextRetryAt).toBeTruthy()
      return cleanupJob('failed')
    })
    const result = await runChatRetention({
      config,
      now: () => fixedNow,
      clock: () => 0,
      repository: {
        prepareChatRetentionCleanup: vi.fn(async () => []),
        listChatCleanupJobs: vi.fn(async () => [cleanupJob()]),
        claimChatCleanupJob: vi.fn(async (_id: string, token: string) => ({ ...cleanupJob('claimed'), claimToken: token })),
        claimUncertainChatCleanupJob: vi.fn(),
        finishChatCleanupJob: finish,
      },
    })

    expect(result).toMatchObject({ attempted: 1, failed: 1, uncertain: 0 })
    expect(finish).toHaveBeenCalledTimes(1)
  })

  it('uses the default job cap when callers provide an invalid batch', async () => {
    const list = vi.fn(async (limit = CHAT_RETENTION_BATCH_SIZE) => {
      expect(limit).toBe(CHAT_RETENTION_BATCH_SIZE)
      return []
    })
    await runChatRetention({
      config,
      now: () => fixedNow,
      clock: () => 0,
      batchSize: 0,
      repository: {
        prepareChatRetentionCleanup: vi.fn(async () => []),
        listChatCleanupJobs: list,
        claimChatCleanupJob: vi.fn(),
        claimUncertainChatCleanupJob: vi.fn(),
        finishChatCleanupJob: vi.fn(),
      },
      cleanup: vi.fn(),
    })
    expect(list).toHaveBeenCalledWith(CHAT_RETENTION_BATCH_SIZE)
  })
})
