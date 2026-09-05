import 'server-only'

import { createHash, randomUUID, timingSafeEqual } from 'node:crypto'

import { getChatRetentionSecret, getChatServerConfig, type ChatServerConfig } from '@/lib/chat-config'
import {
  cleanupDiscordChatJob,
  type ChatCleanupResult,
  type ChatDeliveryDependencies,
} from '@/lib/chat-discord-delivery'
import type { ChatCleanupJob } from '@/lib/chat-delivery-contracts'
import {
  claimChatCleanupJob,
  claimUncertainChatCleanupJob,
  finishChatCleanupJob,
  listChatCleanupJobs,
  prepareChatRetentionCleanup,
} from '@/lib/chat-delivery-repository'
import { createDiscordRestClient, type DiscordRestClient } from '@/lib/chat-discord-client'

export const CHAT_RETENTION_DAYS = 30
export const CHAT_RETENTION_BATCH_SIZE = 8
export const CHAT_RETENTION_MAX_RUNTIME_MS = 45_000
export const CHAT_RETENTION_DISCORD_TIMEOUT_MS = 2_000
export const CHAT_RETENTION_LEASE_SECONDS = 60
export const CHAT_RETENTION_SECRET_MIN_LENGTH = 32

export type ChatRetentionAuthorization = 'authorized' | 'missing_secret' | 'invalid'

function secretDigest(value: string): Buffer {
  return createHash('sha256').update(value, 'utf8').digest()
}

/**
 * Validate the standard Vercel `Authorization: Bearer <CRON_SECRET>` header.
 * Hashing both values before comparison keeps the timing-safe comparison at a
 * fixed length even when a malformed caller supplies a differently-sized
 * token. The secret itself is never returned or logged.
 */
export function authorizeChatRetentionRequest(
  request: Pick<Request, 'headers'>,
  configuredSecret = getChatRetentionSecret(),
): ChatRetentionAuthorization {
  if (!configuredSecret || configuredSecret.length < CHAT_RETENTION_SECRET_MIN_LENGTH || /\s/u.test(configuredSecret)) return 'missing_secret'
  const header = request.headers.get('authorization') ?? ''
  const match = /^Bearer ([^\s]+)$/u.exec(header)
  const candidate = match?.[1] ?? ''
  const valid = timingSafeEqual(secretDigest(candidate), secretDigest(configuredSecret))
  return valid ? 'authorized' : 'invalid'
}

export interface ChatRetentionRunResult {
  prepared: number
  candidates: number
  attempted: number
  succeeded: number
  failed: number
  uncertain: number
  skipped: number
  bounded: boolean
  errorCode: 'configuration_unavailable' | 'chat_unavailable' | null
}

interface RetentionRepository {
  prepareChatRetentionCleanup: typeof prepareChatRetentionCleanup
  listChatCleanupJobs: typeof listChatCleanupJobs
  claimChatCleanupJob: typeof claimChatCleanupJob
  claimUncertainChatCleanupJob: typeof claimUncertainChatCleanupJob
  finishChatCleanupJob: typeof finishChatCleanupJob
}

const defaultRepository: RetentionRepository = {
  prepareChatRetentionCleanup,
  listChatCleanupJobs,
  claimChatCleanupJob,
  claimUncertainChatCleanupJob,
  finishChatCleanupJob,
}

type CleanupRunner = (
  job: ChatCleanupJob,
  dependencies: ChatDeliveryDependencies,
) => Promise<ChatCleanupResult>

export interface ChatRetentionRunDependencies {
  config?: ChatServerConfig
  now?: () => Date
  /** Injectable wall clock used to make the runtime budget deterministic in tests. */
  clock?: () => number
  uuid?: () => string
  client?: DiscordRestClient
  batchSize?: number
  maxRuntimeMs?: number
  repository?: Partial<RetentionRepository>
  cleanup?: CleanupRunner
}

function safeNow(dependencies: ChatRetentionRunDependencies): Date {
  const value = dependencies.now?.() ?? new Date()
  return Number.isFinite(value.getTime()) ? value : new Date()
}

function safeClock(dependencies: ChatRetentionRunDependencies): number {
  const value = dependencies.clock?.() ?? Date.now()
  return Number.isFinite(value) ? value : Date.now()
}

function uuidFor(dependencies: ChatRetentionRunDependencies): string {
  return dependencies.uuid?.() ?? randomUUID()
}

function boundedBatchSize(value: number | undefined): number {
  if (!Number.isInteger(value) || value === undefined || value < 1) return CHAT_RETENTION_BATCH_SIZE
  return Math.min(CHAT_RETENTION_BATCH_SIZE, value)
}

function boundedRuntime(value: number | undefined): number {
  if (!Number.isInteger(value) || value === undefined || value < 1) return CHAT_RETENTION_MAX_RUNTIME_MS
  return Math.min(CHAT_RETENTION_MAX_RUNTIME_MS, value)
}

function emptyResult(errorCode: ChatRetentionRunResult['errorCode'] = null): ChatRetentionRunResult {
  return {
    prepared: 0,
    candidates: 0,
    attempted: 0,
    succeeded: 0,
    failed: 0,
    uncertain: 0,
    skipped: 0,
    bounded: false,
    errorCode,
  }
}

function cleanupRepository(repository: RetentionRepository): ChatDeliveryDependencies['repository'] {
  return { finishChatCleanupJob: repository.finishChatCleanupJob }
}

async function claimCleanupJob(
  job: ChatCleanupJob,
  repository: RetentionRepository,
  dependencies: ChatRetentionRunDependencies,
): Promise<ChatCleanupJob | null> {
  const initialToken = uuidFor(dependencies)
  if (job.state === 'uncertain') {
    return repository.claimUncertainChatCleanupJob(job.id, initialToken, CHAT_RETENTION_LEASE_SECONDS)
  }

  const claimed = await repository.claimChatCleanupJob(job.id, initialToken, CHAT_RETENTION_LEASE_SECONDS)
  if (claimed.state !== 'uncertain') return claimed.state === 'claimed' ? claimed : null

  // An expired claim is first normalized to uncertain by the ordinary claim
  // RPC. Reconciliation gets its own fresh token and attempt fence.
  return repository.claimUncertainChatCleanupJob(job.id, uuidFor(dependencies), CHAT_RETENTION_LEASE_SECONDS)
}

/**
 * Run only body-free Discord cleanup work. This worker never calls the live
 * delivery dispatcher; terminal conversations are prepared by the database
 * RPC and the external deletion is fenced by a durable cleanup claim.
 */
export async function runChatRetention(
  dependencies: ChatRetentionRunDependencies = {},
): Promise<ChatRetentionRunResult> {
  const config = dependencies.config ?? getChatServerConfig()
  // Preparation only needs the fixed stored coordinates. If the bot is
  // temporarily unavailable, the website transcript may still be removed and
  // the body-free Discord cleanup row remains retryable for a later run.
  if (!config.discordGuildId || !config.discordChannelId) {
    return emptyResult('configuration_unavailable')
  }

  const repository = { ...defaultRepository, ...(dependencies.repository ?? {}) }
  const batchSize = boundedBatchSize(dependencies.batchSize)
  const startedAt = safeClock(dependencies)
  const maxRuntimeMs = boundedRuntime(dependencies.maxRuntimeMs)
  const deadline = startedAt + maxRuntimeMs
  const now = safeNow(dependencies)
  const result = emptyResult()

  if (startedAt >= deadline) {
    result.bounded = true
    return result
  }

  try {
    const cutoff = new Date(now.getTime() - CHAT_RETENTION_DAYS * 24 * 60 * 60 * 1_000).toISOString()
    const prepared = await repository.prepareChatRetentionCleanup({
      guildId: config.discordGuildId,
      parentChannelId: config.discordChannelId,
      cutoff,
      limit: batchSize,
    })
    result.prepared = prepared.length
  } catch {
    // Existing cleanup rows can still make progress when preparation is
    // temporarily unavailable, but the route reports a partial failure so a
    // missed transcript-retention pass is visible to the scheduler/operator.
    result.errorCode = 'chat_unavailable'
  }

  if (safeClock(dependencies) >= deadline) {
    result.bounded = true
    return result
  }

  let jobs: ChatCleanupJob[]
  try {
    jobs = await repository.listChatCleanupJobs(batchSize)
  } catch {
    result.errorCode = 'chat_unavailable'
    return result
  }
  // The RPC already caps its result, but retain the bound at the runner
  // boundary so a faulty adapter/test cannot expand one scheduled run.
  jobs = jobs.slice(0, batchSize)
  result.candidates = jobs.length

  const cleanup = dependencies.cleanup ?? cleanupDiscordChatJob
  for (const job of jobs) {
    if (safeClock(dependencies) >= deadline) {
      result.bounded = true
      break
    }

    let claimed: ChatCleanupJob | null = null
    try {
      claimed = await claimCleanupJob(job, repository, dependencies)
    } catch {
      result.skipped += 1
      continue
    }
    if (!claimed || claimed.state !== 'claimed' || !claimed.claimToken) {
      result.skipped += 1
      continue
    }

    // A slow database claim must not begin an external DELETE after the
    // bounded wall-clock budget. Leave the durable claim to expire; the next
    // run will normalize it to uncertain and reconcile it safely.
    if (safeClock(dependencies) >= deadline) {
      result.bounded = true
      result.skipped += 1
      break
    }

    result.attempted += 1
    let cleanupResult: ChatCleanupResult
    try {
      const cleanupNow = safeNow(dependencies)
      cleanupResult = await cleanup(claimed, {
        config,
        client: dependencies.client,
        now: () => cleanupNow,
        repository: cleanupRepository(repository),
      })
    } catch {
      // A cleanup implementation must normally fence its failure through the
      // repository. Keep the row retryable if a test/custom implementation
      // throws before it can do so, and do not expose the thrown value.
      result.failed += 1
      continue
    }
    if (cleanupResult.state === 'succeeded') result.succeeded += 1
    else if (cleanupResult.state === 'uncertain') result.uncertain += 1
    else if (cleanupResult.state === 'failed') result.failed += 1
    else result.skipped += 1
  }

  if (!result.bounded && jobs.length >= batchSize && safeClock(dependencies) >= deadline) result.bounded = true
  return result
}

export function createRetentionDiscordClient(config: ChatServerConfig, fetcher?: typeof globalThis.fetch): DiscordRestClient {
  return createDiscordRestClient({
    config,
    fetch: fetcher,
    timeoutMs: CHAT_RETENTION_DISCORD_TIMEOUT_MS,
  })
}
