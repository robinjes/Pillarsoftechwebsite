import { createElement, type ButtonHTMLAttributes, type ImgHTMLAttributes } from 'react'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'

vi.mock('next/script', () => ({ default: ({ onReady }: { onReady: () => void }) => createElement('button', { type: 'button', onClick: onReady }, 'Load verification') }))
vi.mock('next/dynamic', () => ({ default: () => ({ onVerify }: { onVerify: () => void }) => createElement('button', { type: 'button', onClick: onVerify } satisfies ButtonHTMLAttributes<HTMLButtonElement>, 'Complete test game') }))
vi.mock('next/image', () => ({ default: ({ fill: _fill, priority: _priority, ...props }: ImgHTMLAttributes<HTMLImageElement> & { fill?: boolean; priority?: boolean }) => { void _fill; void _priority; return createElement('img', props) } }))

import Contact from '@/components/Contact'
let verify: ((token: string) => void) | undefined
beforeEach(() => {
  vi.stubEnv('NEXT_PUBLIC_TURNSTILE_SITE_KEY', 'test-public-key')
  vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} })
  window.turnstile = { render: vi.fn((_element, options) => { verify = options.callback; return 'widget' }), remove: vi.fn() }
})
afterEach(() => { cleanup(); delete window.turnstile; vi.unstubAllGlobals(); vi.unstubAllEnvs() })

it('requires both the game and a fresh security token, resets on switching and submits only the token', async () => {
  const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ accepted: true }), { status: 202 }))
  vi.stubGlobal('fetch', fetchMock)
  render(<Contact />)
  fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Ada' } })
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'ada@example.com' } })
  fireEvent.change(screen.getByLabelText('Message'), { target: { value: 'Hello' } })
  const send = screen.getByRole('button', { name: 'Send Message' })
  expect(send).toBeDisabled()
  fireEvent.click(screen.getByRole('button', { name: 'Load verification' }))
  await waitFor(() => expect(verify).toBeDefined())
  fireEvent.click(screen.getByLabelText('Fun claw game'))
  fireEvent.click(screen.getByRole('button', { name: 'Complete test game' }))
  expect(send).toBeDisabled()
  // Completing the game alone cannot enable submission.
  await waitFor(() => expect(window.turnstile?.render).toHaveBeenCalledTimes(2))
  fireEvent.click(screen.getByRole('button', { name: 'Load verification' }))
  const { act } = await import('@testing-library/react')
  act(() => verify?.('fresh-token'))
  expect(send).toBeEnabled()
  fireEvent.click(screen.getByLabelText('Regular CAPTCHA'))
  expect(send).toBeDisabled()
  act(() => verify?.('regular-token'))
  expect(send).toBeEnabled()
  fireEvent.click(send)
  await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
  const payload = JSON.parse(fetchMock.mock.calls[0][1].body)
  expect(payload.captchaToken).toBe('regular-token')
  expect(payload).not.toHaveProperty('gameSolved')
  await waitFor(() => expect(screen.getByRole('button', { name: 'Message Received' })).toBeDisabled())
})
