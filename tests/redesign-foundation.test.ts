import { readFileSync } from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

const sourceRoot = path.resolve(process.cwd(), 'src')
const readSource = (relativePath: string) => readFileSync(path.join(sourceRoot, relativePath), 'utf8')

describe('editorial homepage foundation', () => {
  it('keeps the exact hero statement and ordered homepage sections', () => {
    const page = readSource('app/page.tsx')
    expect(page).toContain('STEM belongs in every student’s hands.')
    expect(page.indexOf('<HeroSection />')).toBeLessThan(page.indexOf('<ImpactMetrics'))
    expect(page.indexOf('<ImpactMetrics')).toBeLessThan(page.indexOf('<WorkshopAssembly'))
    expect(page.indexOf('<WorkshopAssembly')).toBeLessThan(page.indexOf('<EventProof'))
    expect(page.indexOf('<EventProof')).toBeLessThan(page.indexOf('<FamilyScienceStory'))
    expect(page.indexOf('<FamilyScienceStory')).toBeLessThan(page.indexOf('<AudienceRoutes'))
    expect(page.indexOf('<AudienceRoutes')).toBeLessThan(page.indexOf('<FinanceSection'))
    expect(page.indexOf('<FinanceSection')).toBeLessThan(page.indexOf('<SupportLinks'))
  })

  it('uses only approved impact data and has a qualitative empty state', () => {
    const page = readSource('app/page.tsx')
    const metrics = readSource('components/site/ImpactMetrics.tsx')
    expect(page).toContain('listPublicImpact()')
    expect(page).not.toContain('stats')
    expect(metrics).toContain('data-testid="impact-empty-state"')
    expect(metrics).toContain('Verified impact data is being prepared')
    expect(metrics).toContain('metric.methodologyNote')
    expect(metrics).toContain('How this is counted')
    expect(page).toContain('Volunteers guide children building marshmallow structures at outdoor tables')
  })

  it('keeps the signature workshop motion restrained and object-only', () => {
    const workshop = readSource('components/site/WorkshopAssembly.tsx')
    expect(workshop).toContain('useScroll')
    expect(workshop).toContain('useTransform')
    expect(workshop).toContain('useReducedMotion')
    expect(workshop).toContain('Access → Build → Lead.')
    expect(workshop).not.toMatch(/https?:\/\//)
    expect(workshop).not.toContain("from 'next/image'")
    expect(workshop).not.toMatch(/people|student|human|avatar/i)
    expect(workshop).toContain('lg:hidden')
    expect(workshop).toContain('lg:block')
  })

  it('locks the palette and typography tokens', () => {
    const css = readSource('app/globals.css')
    const tailwind = readFileSync(path.resolve(process.cwd(), 'tailwind.config.js'), 'utf8')
    const fonts = readSource('lib/fonts.ts')
    for (const token of ['#F3EBDD', '#101114', '#0B1F3A', '#A9D8F2', '#2B5DA8', '#FFFDF8']) {
      expect(css).toContain(token)
      expect(tailwind).toContain(token)
    }
    expect(fonts).toContain('Familjen_Grotesk')
    expect(fonts).toContain('IBM_Plex_Sans')
  })

  it('retains dynamic connection rendering for CSP nonce propagation', () => {
    const layout = readSource('app/layout.tsx')
    expect(layout).toContain("import { connection } from 'next/server'")
    expect(layout).toMatch(/export default async function RootLayout/)
    expect(layout).toContain('await connection()')
    expect(layout).toContain('id="main-content"')
  })

  it('includes the complete trust footer and current-year behavior', () => {
    const footer = readSource('components/Footer.tsx')
    for (const href of ['/about', '/team', '/events', '/volunteer', '/fundraiser', '/faq', '/wishlist', '/newsletter', '/contact']) {
      expect(footer).toContain(href)
    }
    expect(footer).toContain('https://hcb.hackclub.com/pillars-of-tech/transactions')
    expect(footer).toContain('https://www.youtube.com/@PillarsofTech')
    expect(footer).toContain('https://www.instagram.com/thepillarsoftech')
    expect(footer).toContain('new Date().getFullYear()')
    expect(footer).toContain("pathname.startsWith('/admin')")
    expect(footer).toContain("pathname.startsWith('/volunteer/checkin')")
  })

  it('keeps header navigation direct, keyboard-complete, and inclusive of FAQ support', () => {
    const navbar = readSource('components/Navbar.tsx')
    for (const href of ['/about', '/events', '/volunteer', '/fundraiser', '/wishlist', '/newsletter', '/faq', '/contact']) {
      expect(navbar).toContain(href)
    }
    expect(navbar).toContain("event.key === 'Escape'")
    expect(navbar).toContain('event.key !== \'Tab\'')
    expect(navbar).toContain('openButtonRef.current?.focus()')
    expect(navbar).toContain('aria-modal="true"')
    expect(navbar).toContain("pathname.startsWith('/admin')")
    expect(navbar).toContain("pathname.startsWith('/volunteer/checkin')")
  })
})
