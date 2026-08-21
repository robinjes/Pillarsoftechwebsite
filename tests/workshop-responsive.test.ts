import { createElement } from 'react'
import { act, render, waitFor } from '@testing-library/react'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const desktopImport = vi.hoisted(() => ({ count: 0 }))

vi.mock('@/components/site/WorkshopAssemblyDesktop', () => {
  desktopImport.count += 1

  return {
    default: function MockWorkshopAssemblyDesktop() {
      return createElement('section', { 'data-workshop-motion': 'desktop' }, 'desktop workshop')
    },
  }
})

import WorkshopAssembly from '@/components/site/WorkshopAssembly'

type MockMediaQuery = MediaQueryList & { listeners: Set<(event: MediaQueryListEvent) => void> }

let viewportIsDesktop = false
let mediaQueries: MockMediaQuery[] = []
let observerCallback: IntersectionObserverCallback | null = null

const originalMatchMedia = window.matchMedia
const originalIntersectionObserver = window.IntersectionObserver

function installViewportAndObserverMocks() {
  mediaQueries = []
  viewportIsDesktop = false
  observerCallback = null

  window.matchMedia = vi.fn((query: string) => {
    const listeners = new Set<(event: MediaQueryListEvent) => void>()
    const mediaQuery = {
      media: query,
      get matches() {
        return query === '(min-width: 1024px)' && viewportIsDesktop
      },
      onchange: null,
      addEventListener: (_type: string, listener: (event: MediaQueryListEvent) => void) => listeners.add(listener),
      removeEventListener: (_type: string, listener: (event: MediaQueryListEvent) => void) => listeners.delete(listener),
      dispatchEvent: () => true,
      addListener: () => undefined,
      removeListener: () => undefined,
      listeners,
    } as MockMediaQuery
    mediaQueries.push(mediaQuery)
    return mediaQuery
  })

  class MockIntersectionObserver {
    constructor(callback: IntersectionObserverCallback) {
      observerCallback = callback
    }

    observe() {}

    disconnect() {}

    unobserve() {}

    takeRecords() {
      return []
    }
  }

  window.IntersectionObserver = MockIntersectionObserver as unknown as typeof IntersectionObserver
}

function setViewportIsDesktop(nextValue: boolean) {
  viewportIsDesktop = nextValue
  for (const mediaQuery of mediaQueries) {
    for (const listener of mediaQuery.listeners) {
      listener({ matches: mediaQuery.matches, media: mediaQuery.media } as MediaQueryListEvent)
    }
  }
}

afterEach(() => {
  document.body.innerHTML = ''
  window.matchMedia = originalMatchMedia
  window.IntersectionObserver = originalIntersectionObserver
  vi.clearAllMocks()
})

describe('responsive workshop assembly boundary', () => {
  beforeEach(() => {
    installViewportAndObserverMocks()
    desktopImport.count = 0
  })

  it('keeps the desktop import and motion component out of narrow screens, then unloads on shrink', async () => {
    render(createElement(WorkshopAssembly))

    expect(document.querySelector('[data-workshop-static="narrow"]')).toBeInTheDocument()
    expect(document.querySelector('[data-workshop-motion="desktop"]')).not.toBeInTheDocument()
    expect(desktopImport.count).toBe(0)
    const staticFallback = document.querySelector('[data-workshop-static="narrow"]')
    for (const stage of ['FRAME', 'MOTION', 'SENSE', 'LEAD']) expect(staticFallback?.textContent).toContain(stage)

    act(() => setViewportIsDesktop(true))
    await waitFor(() => expect(observerCallback).not.toBeNull())
    expect(desktopImport.count).toBe(0)

    act(() => setViewportIsDesktop(false))
    act(() => {
      observerCallback?.(
        [{ isIntersecting: true } as IntersectionObserverEntry],
        {} as IntersectionObserver,
      )
    })
    expect(desktopImport.count).toBe(0)

    act(() => setViewportIsDesktop(true))
    await waitFor(() => expect(observerCallback).not.toBeNull())
    act(() => {
      observerCallback?.(
        [{ isIntersecting: true } as IntersectionObserverEntry],
        {} as IntersectionObserver,
      )
    })
    await waitFor(() => expect(document.querySelector('[data-workshop-motion="desktop"]')).toBeInTheDocument())
    expect(desktopImport.count).toBe(1)

    act(() => setViewportIsDesktop(false))
    expect(document.querySelector('[data-workshop-motion="desktop"]')).not.toBeInTheDocument()
    expect(document.querySelector('[data-workshop-static="narrow"]')).toBeInTheDocument()

    act(() => setViewportIsDesktop(true))
    await waitFor(() => expect(document.querySelector('[data-workshop-motion="desktop"]')).toBeInTheDocument())
    expect(desktopImport.count).toBe(1)
  })

  it('keeps the static fallback content and evidence markers stable', () => {
    const sourceRoot = path.resolve(process.cwd(), 'src')
    const workshopSource = readFileSync(path.join(sourceRoot, 'components/site/WorkshopAssembly.tsx'), 'utf8')
    const loaderSource = readFileSync(path.join(sourceRoot, 'components/site/WorkshopAssemblyDesktopLoader.tsx'), 'utf8')
    const desktopSource = readFileSync(path.join(sourceRoot, 'components/site/WorkshopAssemblyDesktop.tsx'), 'utf8')
    const workshopDataSource = readFileSync(path.join(sourceRoot, 'components/site/workshopAssemblyData.ts'), 'utf8')

    expect(workshopSource).toContain('className="relative bg-midnight text-warm lg:hidden"')
    expect(workshopSource).toContain('data-workshop-static="narrow"')
    expect(workshopSource).toContain('/images/events/family-science-night-altamont/drive-02.webp')
    expect(workshopSource).toContain('An older student demonstrates a VEX robot to three younger students at Family Science Night.')
    expect(workshopSource).toContain('data-contact-sheet')
    expect(workshopSource).toContain('field-note-photo')
    expect(workshopSource).toContain('workshop-registration-layer')
    for (const stage of ['FRAME', 'MOTION', 'SENSE', 'LEAD']) expect(workshopDataSource).toContain(stage)
    expect(loaderSource).toContain("'(min-width: 1024px)'")
    expect(loaderSource).toContain('useState(false)')
    expect(loaderSource).toContain('if (!isDesktop) return null')
    expect(loaderSource).toContain('!desktopViewportMatches()')
    expect(loaderSource).toContain("import('@/components/site/WorkshopAssemblyDesktop')")
    expect(loaderSource).toContain('IntersectionObserver')
    expect(desktopSource).toContain('data-workshop-motion="desktop"')
  })
})
