import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

const root = process.cwd()
const read = (relativePath: string) => readFileSync(path.join(root, relativePath), 'utf8')

describe('family-friendly public foundation', () => {
  it('keeps the exact hero statement and ordered homepage sections', () => {
    const page = read('src/app/page.tsx')
    const hero = read('src/components/site/TimelapseHero.tsx')

    expect(hero).toContain('STEM belongs in every student’s hands.')
    const sections = [
      '<TimelapseHero />',
      '<TrustStrip />',
      '<FamiliesIntro />',
      '<NextEventSection',
      '<EventProof />',
      '<MissionSection />',
      '<BranchesSection />',
      '<FinanceSection />',
      '<ContactCta />',
    ]
    for (let index = 1; index < sections.length; index += 1) {
      expect(page.indexOf(sections[index - 1])).toBeLessThan(page.indexOf(sections[index]))
    }
    expect(page).toContain('listPublicEvents()')
    expect(page).toContain('listPublicImpact()')
    expect(page).toContain('<ImpactSection metrics={impactMetrics} />')
    expect(page).toContain('.catch(() => [] as PublicEvent[])')
    expect(page).not.toContain('WorkshopAssembly')
    expect(page).not.toContain('PublicAtmosphere')
    expect(page).not.toContain('min-h-[320vh]')
  })

  it('uses approved typography and the complete family token set', () => {
    const css = read('src/app/globals.css')
    const tailwind = read('tailwind.config.js')
    const fonts = read('src/lib/fonts.ts')

    for (const token of ['#0D2B4A', '#17334D', '#DED5C7', '#F7F3EB', '#B9DDEC', '#F7CA55', '#E9A98F', '#AAC6A5']) {
      expect(css).toContain(token)
      expect(tailwind).toContain(token)
    }
    expect(fonts).toContain("import { Atkinson_Hyperlegible, Fredoka } from 'next/font/google'")
    expect(fonts).toContain("variable: '--font-display'")
    expect(fonts).toContain("variable: '--font-body'")
    expect(css).toContain('.button')
    expect(css).toContain('.friendly-card')
    expect(css).toContain('.shell')
    expect(css).toContain('.section-heading')
    expect(css).toContain('.focus-ring')
    expect(css).toContain('.form-control')
    expect(css).toContain('.status-pill')
    expect(css).toContain('.long-form-copy')
    expect(css).toContain('min-height: 44px')
    expect(css).toContain('border-radius: 999px')
  })

  it('keeps both approved 720p films and posters in stable public paths', () => {
    const hero = read('src/components/site/TimelapseHero.tsx')
    for (const asset of [
      'public/videos/home/wildcat-tank-timelapse-720p.mp4',
      'public/videos/home/wildcat-carnival-timelapse-720p.mp4',
      'public/images/home/wildcat-tank-poster.jpg',
      'public/images/home/wildcat-carnival-poster.jpg',
    ]) {
      expect(existsSync(path.join(root, asset)), asset).toBe(true)
    }
    expect(hero).toContain('preload="metadata"')
    expect(hero).toContain('preload="none"')
    expect(hero).toContain('muted')
    expect(hero).toContain('playsInline')
    expect(hero).toContain('onEnded')
    expect(hero).toContain('visibilitychange')
    expect(hero).toContain('prefers-reduced-motion: reduce')
    expect(hero).not.toContain('controls')
  })

  it('keeps dynamic connection rendering for CSP nonce propagation', () => {
    const layout = read('src/app/layout.tsx')
    expect(layout).toContain("import { connection } from 'next/server'")
    expect(layout).toMatch(/export default async function RootLayout/)
    expect(layout).toContain('await connection()')
    expect(layout).toContain('id="main-content"')
    expect(layout).not.toContain('PublicAtmosphere')
  })

  it('keeps the real finance and action destinations', () => {
    const page = `${read('src/components/site/FinanceSection.tsx')}\n${read('src/components/site/ContactCta.tsx')}`
    expect(page).toContain('https://hcb.hackclub.com/pillars-of-tech/transactions')
    expect(page).toContain('https://hcb.hackclub.com/donations/start/pillars-of-tech')
    expect(page).toContain('href="/contact"')
    expect(read('src/components/site/NextEventSection.tsx')).toContain('/events/${event.slug}')
    expect(read('src/components/site/NextEventSection.tsx')).toContain('{event.title}')
    expect(read('src/components/site/ImpactSection.tsx')).toContain('methodologyNote')
    expect(read('src/components/site/BranchesSection.tsx')).toContain('href="/events"')
    expect(read('src/components/site/BranchesSection.tsx')).not.toMatch(/branch-card--georgia[\s\S]*?<a\b/)
  })
})
