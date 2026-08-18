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

  it('uses source-dated impact data with a compact, accessible caveat disclosure', () => {
    const page = readSource('app/page.tsx')
    const metrics = readSource('components/site/ImpactMetrics.tsx')
    expect(page).toContain('listPublicImpact()')
    expect(page).not.toContain('stats')
    expect(metrics).toContain('previewImpactSnapshot')
    expect(metrics).toContain('How these numbers are counted')
    expect(metrics).toContain('metric.methodologyNote')
    expect(page).toContain('/images/events/science-odyssey/drive-02.webp')
    expect(page).toContain('Students compare and test marshmallow structures at the Science Odyssey engineering table.')
    expect(page).toContain('priority')
    expect(page).not.toContain('loading="eager"')
  })

  it('keeps the signature workshop motion restrained and object-only', () => {
    const workshop = readSource('components/site/WorkshopAssembly.tsx')
    const desktopWorkshop = readSource('components/site/WorkshopAssemblyDesktop.tsx')
    const desktopLoader = readSource('components/site/WorkshopAssemblyDesktopLoader.tsx')
    const workshopData = readSource('components/site/workshopAssemblyData.ts')
    expect(workshop).toContain('Access → Build → Lead.')
    expect(workshop).toContain('DesktopWorkshopAssemblyLoader')
    expect(workshop).toContain('lg:hidden')
    expect(workshop).not.toContain('framer-motion')
    expect(workshop).not.toContain('priority')
    expect(workshop).toContain('alt={visual.alt}')
    expect(desktopWorkshop).toContain('useScroll')
    expect(desktopWorkshop).toContain('useTransform')
    expect(desktopWorkshop).toContain('useReducedMotion')
    expect(desktopWorkshop).toContain("import Image from 'next/image'")
    expect(desktopWorkshop).toContain('ref={sectionRef}')
    expect(desktopWorkshop).toContain('min-h-[280vh]')
    for (const asset of ['access.webp', 'build.webp', 'lead.webp']) {
      expect(workshopData).toContain(`/images/workshop/${asset}`)
      expect(desktopWorkshop).toContain(`/images/workshop/${asset}`)
    }
    for (const asset of ['chassis-v2.webp', 'wheel-v2.webp', 'electronics-v2.webp', 'sensor-v2.webp']) {
      expect(desktopWorkshop).toContain(`/images/workshop/${asset}`)
    }
    expect(workshopData).toContain('A closed workshop kit ready to open for a STEM project.')
    expect(workshopData).toContain('An open STEM kit with wheels, sensors, wiring, and rover parts ready to assemble.')
    expect(workshopData).toContain('A completed rover with its components assembled and ready to test.')
    expect(workshopData).toContain('A rover project moves from a closed kit to organized components and a completed build through Access, Build, and Lead.')
    expect(desktopWorkshop).toContain('role="img"')
    expect(desktopWorkshop).toContain('aria-hidden="true"')
    expect(desktopWorkshop).toContain('rotateX')
    expect(desktopWorkshop).toContain('useAssemblyPart')
    expect(desktopWorkshop).toContain('reducedMotion ? 1 : finalOpacity')
    expect(desktopWorkshop).toContain('[0, 0.08, 0.2, 0.3, 0.48]')
    expect(desktopWorkshop).not.toContain('scaleX')
    expect(desktopWorkshop).not.toMatch(/\/images\/(?:people|students|avatars)\//i)
    expect(desktopLoader).toContain("matchMedia('(min-width: 1024px)')")
    expect(desktopLoader).toContain("import('@/components/site/WorkshopAssemblyDesktop')")
    expect(desktopLoader).toContain('requestedRef.current')
    expect(desktopLoader).toContain("mediaQuery.addEventListener('change'")
    expect(desktopLoader).toContain('min-h-[280vh]')
    expect(desktopLoader).toContain('aria-hidden="true"')
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
