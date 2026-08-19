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
    const heroVisual = readSource('components/site/HeroVisual.tsx')
    const metrics = readSource('components/site/ImpactMetrics.tsx')
    expect(page).toContain('listPublicImpact()')
    expect(page).not.toContain('stats')
    expect(metrics).toContain('previewImpactSnapshot')
    expect(metrics).toContain('How these numbers are counted')
    expect(metrics).toContain('metric.methodologyNote')
    expect(heroVisual).toContain('/images/events/science-odyssey/drive-02.webp')
    expect(heroVisual).toContain('Students compare and test marshmallow structures at the Science Odyssey engineering table.')
    expect(heroVisual).toContain('priority')
    expect(heroVisual).toContain('clipPath')
    expect(heroVisual).toContain('useTransform')
    expect(readSource('components/site/HeroMotion.tsx')).toContain('useReducedMotion')
    expect(page).not.toContain('loading="eager"')
  })

  it('keeps the workshop assembly as a lazy, responsive, object-only WebGL scene', () => {
    const packageJson = JSON.parse(readFileSync(path.resolve(process.cwd(), 'package.json'), 'utf8')) as {
      dependencies?: Record<string, string>
      devDependencies?: Record<string, string>
    }
    const workshop = readSource('components/site/WorkshopAssembly.tsx')
    const desktopWorkshop = readSource('components/site/WorkshopAssemblyDesktop.tsx')
    const desktopLoader = readSource('components/site/WorkshopAssemblyDesktopLoader.tsx')
    const workshopData = readSource('components/site/workshopAssemblyData.ts')
    expect(packageJson.dependencies?.three).toBe('0.185.1')
    expect(packageJson.dependencies?.['@react-three/fiber']).toBe('9.7.0')
    expect(packageJson.dependencies?.['@types/three']).toBeUndefined()
    expect(packageJson.devDependencies?.['@types/three']).toBe('0.185.4')
    expect(workshop).toContain('Every part has a purpose.')
    expect(workshop).toContain('Frame, Motion, Sense, and Lead')
    expect(workshop).toContain('DesktopWorkshopAssemblyLoader')
    expect(workshop).not.toContain('next/image')
    expect(desktopWorkshop).toContain("from '@react-three/fiber'")
    expect(desktopWorkshop).toContain("from 'three'")
    expect(desktopWorkshop).toContain("from 'three/examples/jsm/loaders/GLTFLoader.js'")
    expect(desktopWorkshop).toContain('useFrame')
    expect(desktopWorkshop).toContain('RoomEnvironment')
    expect(desktopWorkshop).toContain('ACESFilmicToneMapping')
    expect(desktopWorkshop).toContain('SRGBColorSpace')
    expect(desktopWorkshop).toContain('/models/perseverance/perseverance-runtime.glb')
    for (const unit of [
      'Body', 'Body_Parts', 'Body_Parts.001', 'base', 'box', 'part_01', 'Armature', 'Empty',
      'suspension', 'Wheels_objs', 'Body.002', 'Body.003',
      'Cylinder', 'lab', 'rtg', 'antenna_uhf', 'antenna_hg', 'antenna_lg', 'RIMFAX',
      'hazcams_front', 'hazcams_front_cover', 'hazcams_rear', 'hazcams_rear_cover_l',
      'hazcams_rear_cover_r', 'hazcams_rear_wiring', 'microphones', 'Up_Look_Camera',
      'Down_Look_Camera', 'calibration_target', 'calibration_target_bracket',
      'arm.001', 'arm.003', 'arm_01_joint', 'arm_02_joint', 'pan_end cover', 'arm_cable_etc',
      'Name_Chips', 'probe',
    ]) expect(desktopWorkshop).toContain(`'${unit}'`)
    expect(desktopWorkshop).toContain('makeAssemblyPlans')
    expect(desktopWorkshop).toContain('node.parent !== scene')
    expect(desktopWorkshop).toContain('start + index * stagger')
    expect(desktopWorkshop).toContain('0.018, 0.23')
    expect(desktopWorkshop).toContain('0.035, 0.24')
    expect(desktopWorkshop).toContain('0.014, 0.24')
    expect(desktopWorkshop).toContain('0.018, 0.21')
    expect(desktopWorkshop).toContain('quinticEase')
    expect(desktopWorkshop).toContain('setAssemblyState(snapshot, value)')
    expect(desktopWorkshop).toContain('initialProgress')
    expect(desktopWorkshop).toContain('idleSpinAngle')
    expect(desktopWorkshop).toContain('idleSpinVelocity')
    expect(desktopWorkshop).toContain('(Math.PI * 2) / 24')
    expect(desktopWorkshop).toContain('idleSpinAngle.current += idleSpinVelocity.current * delta')
    expect(desktopWorkshop).toContain('idleSpinAngle.current = 0')
    expect(desktopWorkshop).toContain('ROVER READY')
    expect(desktopWorkshop).toContain("currentStage.isReady ? 'ROVER READY' : currentStage.title")
    expect(desktopWorkshop).not.toContain('mt-2 font-display text-[0.65rem]')
    expect(workshopData).toContain('When motion is enabled')
    expect(desktopWorkshop).toContain('ref={sectionRef}')
    expect(desktopWorkshop).toContain('min-h-[320vh]')
    expect(desktopWorkshop).toContain('min-h-[175vh]')
    expect(desktopWorkshop).toContain("prefers-reduced-motion: reduce")
    expect(desktopWorkshop).toContain('useCurrentStage')
    expect(desktopWorkshop).not.toContain('border-y')
    expect(desktopWorkshop).not.toContain('grid-cols-3')
    expect(desktopWorkshop).toContain('planeGeometry')
    expect(desktopWorkshop).not.toContain('boxGeometry')
    expect(desktopWorkshop).not.toContain('cylinderGeometry')
    expect(desktopWorkshop).not.toContain('DRACOLoader')
    expect(workshopData).not.toContain('/images/workshop/')
    for (const stage of ['FRAME', 'MOTION', 'SENSE', 'LEAD']) expect(workshopData).toContain(stage)
    expect(desktopWorkshop).not.toContain('/images/workshop/')
    expect(desktopWorkshop).toContain('role="img"')
    expect(desktopWorkshop).toContain('aria-hidden="true"')
    expect(desktopWorkshop).toContain('aria-label={desktopVisualLabel}')
    expect(desktopWorkshop).toContain('scroll')
    expect(desktopWorkshop).toContain('damp(')
    expect(desktopWorkshop).not.toContain('framer-motion')
    expect(desktopWorkshop).not.toMatch(/\/images\/(?:people|students|avatars|workshop)\//i)
    expect(desktopLoader).toContain("import('@/components/site/WorkshopAssemblyDesktop')")
    expect(desktopLoader).toContain('requestedRef.current')
    expect(desktopLoader).toContain('IntersectionObserver')
    expect(desktopLoader).toContain("rootMargin: '480px 0px'")
    expect(desktopLoader).toContain('max-lg:min-h-[175vh]')
    expect(desktopLoader).toContain('motion-reduce:min-h-screen')
    expect(desktopLoader).toContain('aria-busy="true"')
    expect(desktopLoader).toContain('min-h-screen')
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
    expect(navbar.match(/label: 'Events', href: '\/events'/g) ?? []).toHaveLength(0)
    expect(navbar.match(/Find an event/g) ?? []).toHaveLength(2)
  })
})
