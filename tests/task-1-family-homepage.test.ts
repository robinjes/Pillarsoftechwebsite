import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

const root = process.cwd()
const read = (relativePath: string) => readFileSync(path.join(root, relativePath), 'utf8')

describe('Task 1 family homepage foundation', () => {
  it('locks the approved palette, typography, and reusable family primitives', () => {
    const css = read('src/app/globals.css')
    const tailwind = read('tailwind.config.js')
    const fonts = read('src/lib/fonts.ts')

    for (const token of ['#0D2B4A', '#17334D', '#DED5C7', '#F7F3EB', '#B9DDEC', '#F7CA55', '#E9A98F', '#AAC6A5']) {
      expect(css).toContain(token)
      expect(tailwind).toContain(token)
    }
    expect(fonts).toContain('Fredoka')
    expect(fonts).toContain('Atkinson_Hyperlegible')
    expect(fonts).not.toContain('Familjen_Grotesk')
    expect(fonts).not.toContain('IBM_Plex_Sans')
    for (const className of ['.button', '.friendly-card', '.shell', '.section-heading', '.focus-ring', '.form-control', '.status-pill', '.long-form-copy']) {
      expect(css).toContain(className)
    }
    expect(css).toContain('min-height: 44px')
  })

  it('keeps every public CSS and Tailwind hex literal inside the exact eight-color palette', () => {
    const allowed = new Set([
      '#0D2B4A',
      '#17334D',
      '#DED5C7',
      '#F7F3EB',
      '#B9DDEC',
      '#F7CA55',
      '#E9A98F',
      '#AAC6A5',
    ].map((value) => value.toLowerCase()))
    const source = `${read('src/app/globals.css')}\n${read('tailwind.config.js')}`
    const hexes = source.match(/#[\da-f]{3,8}/gi) ?? []

    expect(hexes.length).toBeGreaterThan(0)
    expect(hexes.filter((hex) => !allowed.has(hex.toLowerCase()))).toEqual([])
  })

  it('uses the silent timelapse hero and keeps the homepage ordered by family intent', () => {
    const page = read('src/app/page.tsx')
    const hero = read('src/components/site/TimelapseHero.tsx')

    for (const section of ['<TimelapseHero />', '<TrustStrip />', '<FamiliesIntro />', '<NextEventSection', '<EventProof />', '<MissionSection />', '<ImpactSection metrics={impactMetrics} />', '<BranchesSection />', '<FinanceSection />', '<ContactCta />']) {
      expect(page).toContain(section)
    }
    const orderedSections = ['<TimelapseHero />', '<TrustStrip />', '<FamiliesIntro />', '<NextEventSection', '<EventProof />', '<MissionSection />', '<ImpactSection metrics={impactMetrics} />', '<BranchesSection />', '<FinanceSection />', '<ContactCta />']
    for (let index = 1; index < orderedSections.length; index += 1) {
      expect(page.indexOf(orderedSections[index - 1])).toBeLessThan(page.indexOf(orderedSections[index]))
    }
    expect(page).not.toContain('WorkshopAssembly')
    expect(page).not.toContain('PublicAtmosphere')
    expect(page).not.toContain('min-h-[320vh]')

    expect(hero).toContain('/videos/home/wildcat-tank-timelapse-720p.mp4')
    expect(hero).toContain('/videos/home/wildcat-carnival-timelapse-720p.mp4')
    expect(hero).toContain('/images/home/wildcat-tank-poster.jpg')
    expect(hero).toContain('/images/home/wildcat-carnival-poster.jpg')
    expect(hero).toContain('preload="none"')
    expect(hero).toContain('prefers-reduced-motion: reduce')
    expect(hero).toContain('visibilitychange')
    expect(hero).toContain('onEnded')
    expect(hero).not.toContain('controls')
  })

  it('ships the two optimized hero videos and both posters without the source MOV files', () => {
    for (const asset of [
      'public/videos/home/wildcat-tank-timelapse-720p.mp4',
      'public/videos/home/wildcat-carnival-timelapse-720p.mp4',
      'public/images/home/wildcat-tank-poster.jpg',
      'public/images/home/wildcat-carnival-poster.jpg',
    ]) {
      expect(existsSync(path.join(root, asset)), asset).toBe(true)
    }
    expect(existsSync(path.join(root, 'public/videos/home/wildcat-tank-timelapse.mov'))).toBe(false)
    expect(existsSync(path.join(root, 'public/videos/home/wildcat-carnival-timelapse.mov'))).toBe(false)
  })

  it('keeps locked public navigation and protected-route omission', () => {
    const navbar = read('src/components/Navbar.tsx')
    const footer = read('src/components/Footer.tsx')

    for (const label of ['For Families', 'Events', 'Our Work', 'Volunteer', 'Contact']) {
      expect(navbar).toContain(label)
    }
    for (const href of ['/events', '/volunteer', '/contact']) {
      expect(navbar).toContain(href)
    }
    for (const href of ['/fundraiser', '/wishlist', '/newsletter', '/faq']) {
      expect(footer).toContain(href)
    }
    expect(navbar).toContain('aria-modal="true"')
    expect(navbar).toContain("event.key === 'Escape'")
    expect(navbar).toContain("event.key !== 'Tab'")
    expect(navbar).toContain('openButtonRef.current?.focus()')
    expect(navbar).toContain("document.body.style.overflow = 'hidden'")
    expect(navbar).toContain("pathname.startsWith('/admin')")
    expect(navbar).toContain("pathname.startsWith('/volunteer/checkin')")
    expect(footer).toContain("pathname.startsWith('/admin')")
    expect(footer).toContain("pathname.startsWith('/volunteer/checkin')")
  })
})
