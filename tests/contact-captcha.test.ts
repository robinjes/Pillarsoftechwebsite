import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))
import { verifyContactCaptcha } from '@/lib/contact-captcha'
import { contactSubmissionSchema } from '@/lib/content-contracts'

const fetchMock = vi.fn()
beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock)
  fetchMock.mockReset()
  vi.stubEnv('TURNSTILE_SECRET_KEY', 'server-test-secret')
  vi.stubEnv('TURNSTILE_ALLOWED_HOSTNAMES', '')
  vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://pillarsoftech.org')
})
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals() })

describe('server-verified contact CAPTCHA', () => {
  it('sends only the secret and token and accepts the intended action and website', async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ success: true, action: 'contact', hostname: 'www.pillarsoftech.org' })))
    await expect(verifyContactCaptcha('opaque-token')).resolves.toBe(true)
    expect(fetchMock).toHaveBeenCalledWith('https://challenges.cloudflare.com/turnstile/v0/siteverify', expect.objectContaining({
      method: 'POST', cache: 'no-store', body: JSON.stringify({ secret: 'server-test-secret', response: 'opaque-token' }), signal: expect.any(AbortSignal),
    }))
  })

  it.each([
    { success: false, 'error-codes': ['timeout-or-duplicate'] },
    { success: true, action: 'login', hostname: 'pillarsoftech.org' },
    { success: true, action: 'contact', hostname: 'evil.example' },
    { success: true, action: 'contact', hostname: 'pillarsoftech.org.evil.example' },
    { success: true },
    null,
  ])('rejects unsuccessful, malformed, or mismatched verification: %j', async (result) => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify(result)))
    await expect(verifyContactCaptcha('opaque-token')).resolves.toBe(false)
  })

  it('supports explicitly configured preview hostnames', async () => {
    vi.stubEnv('TURNSTILE_ALLOWED_HOSTNAMES', 'preview.example, pillarsoftech.org')
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ success: true, action: 'contact', hostname: 'preview.example' })))
    await expect(verifyContactCaptcha('opaque-token')).resolves.toBe(true)
  })

  it('fails closed without configuration and during provider outages', async () => {
    vi.stubEnv('TURNSTILE_SECRET_KEY', '')
    await expect(verifyContactCaptcha('opaque-token')).rejects.toThrow('CAPTCHA unavailable')
    expect(fetchMock).not.toHaveBeenCalled()
    vi.stubEnv('TURNSTILE_SECRET_KEY', 'server-test-secret')
    fetchMock.mockResolvedValueOnce(new Response('unavailable', { status: 503 }))
    await expect(verifyContactCaptcha('opaque-token')).rejects.toThrow('CAPTCHA unavailable')
    fetchMock.mockRejectedValueOnce(new DOMException('Timeout', 'TimeoutError'))
    await expect(verifyContactCaptcha('opaque-token')).rejects.toThrow()
  })

  it('requires a bounded token and rejects a client game completion claim', () => {
    const body = { name: 'Ada', email: 'ada@example.com', subject: 'Question', message: 'Hello' }
    expect(contactSubmissionSchema.safeParse(body).success).toBe(false)
    expect(contactSubmissionSchema.safeParse({ ...body, captchaToken: 'x'.repeat(2049) }).success).toBe(false)
    expect(contactSubmissionSchema.safeParse({ ...body, captchaToken: 'token', gameSolved: true }).success).toBe(false)
  })
})
