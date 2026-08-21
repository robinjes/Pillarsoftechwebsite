import { readFileSync } from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

const sourceRoot = path.resolve(process.cwd(), 'src')
const readSource = (relativePath: string) => readFileSync(path.join(sourceRoot, relativePath), 'utf8')

describe('Signal Relay public foundation', () => {
  it('keeps the intended homepage order and specific mission statement', () => {
    const page = readSource('app/page.tsx')
    expect(page).toContain('Give students the tools. <em>Watch what they build.</em>')
    const sections = ['<HeroSection />', '<ImpactMetrics', '<ProcessSection />', '<EventSignalSection', '<RealWorkSection />', '<AudienceRoutes />', '<FinanceSection', '<SupportLinks />']
    for (let index = 1; index < sections.length; index += 1) {
      expect(page.indexOf(sections[index - 1])).toBeLessThan(page.indexOf(sections[index]))
    }
    expect(page).toContain('listPublicImpact()')
    expect(page).toContain('listPublicEvents()')
  })

  it('uses flat Signal Relay palette tokens and the requested type system', () => {
    const css = readSource('app/globals.css')
    const tailwind = readFileSync(path.resolve(process.cwd(), 'tailwind.config.js'), 'utf8')
    const fonts = readSource('lib/fonts.ts')
    for (const token of ['#EEE9DC', '#111310', '#183BFF', '#FF5B35', '#C7CED3', '#F8F6EF']) {
      expect(css).toContain(token)
      expect(tailwind).toContain(token)
    }
    expect(fonts).toContain('Anybody')
    expect(fonts).toContain('Archivo')
    expect(fonts).toContain('IBM_Plex_Mono')
    expect(css).toContain('--font-mono-stack')
    expect(css).not.toContain('backdrop-filter')
    expect(css).not.toContain('linear-gradient')
  })

  it('keeps the scanner and signal path as the only signature interactions', () => {
    const scanner = readSource('components/site/SignalScanner.tsx')
    const pathSource = readSource('components/site/SignalPath.tsx')
    expect(scanner).toContain('data-signal-scanner')
    expect(scanner).toContain('onPointerMove')
    expect(scanner).toContain('aria-pressed={isRevealed}')
    expect(pathSource).toContain('useScroll')
    expect(pathSource).toContain('useTransform')
    expect(pathSource).toContain('QUESTION')
    expect(pathSource).toContain('SHARE')
    expect(pathSource).toContain('reducedMotion ? 1 : pathLength')
  })

  it('retains dynamic connection rendering for CSP nonce propagation', () => {
    const layout = readSource('app/layout.tsx')
    expect(layout).toContain("import { connection } from 'next/server'")
    expect(layout).toMatch(/export default async function RootLayout/)
    expect(layout).toContain('await connection()')
    expect(layout).toContain('id="main-content"')
  })

  it('keeps the complete trust footer and protected-route exclusions', () => {
    const footer = readSource('components/Footer.tsx')
    const navbar = readSource('components/Navbar.tsx')
    const atmosphere = readSource('components/site/PublicAtmosphere.tsx')
    for (const href of ['/about', '/team', '/events', '/volunteer', '/fundraiser', '/faq', '/wishlist', '/newsletter', '/contact']) {
      expect(footer).toContain(href)
    }
    expect(footer).toContain('https://hcb.hackclub.com/pillars-of-tech/transactions')
    expect(footer).toContain('https://www.youtube.com/@PillarsofTech')
    expect(footer).toContain('https://www.instagram.com/thepillarsoftech')
    expect(footer).toContain('new Date().getFullYear()')
    for (const source of [footer, navbar, atmosphere]) {
      expect(source).toContain("pathname.startsWith('/admin')")
      expect(source).toContain("pathname.startsWith('/volunteer/checkin')")
    }
    expect(navbar).toContain('Find an event')
    expect(navbar).not.toMatch(/label: 'Events', href: '\/events'/)
  })

  it('does not present archive imagery as event-owned upcoming proof', () => {
    const page = readSource('app/page.tsx')
    expect(page).toContain("events.find((event) => event.status === 'completed')")
    expect(page).not.toContain("events.find((event) => event.status === 'completed' || event.status === 'cancelled')")
    expect(page).toContain('A recent Pillars of Tech workshop with students and volunteers.')
    expect(page).toContain('Archive image · upcoming program details at right.')
    expect(page).toContain('isEventOwned')
  })

  it('ships a server-safe reusable subpage intro primitive', () => {
    const intro = readSource('components/site/SignalPageIntro.tsx')
    expect(intro).not.toContain("'use client'")
    for (const prop of ['eyebrow', 'title', 'description', 'image', 'actions', 'tone', 'imagePosition']) expect(intro).toContain(prop)
    expect(intro).toContain('signal-page-intro__mark')
    expect(intro).toContain('signal-page-intro__title')
  })
})
