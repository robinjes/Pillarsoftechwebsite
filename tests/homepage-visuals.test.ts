import { readFileSync } from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

const sourceRoot = path.resolve(process.cwd(), 'src')
const readSource = (relativePath: string) => readFileSync(path.join(sourceRoot, relativePath), 'utf8')

describe('family homepage visual content', () => {
  it('uses approved real-event photography with useful alternative text', () => {
    const eventProof = readSource('components/site/EventProof.tsx')
    const mission = readSource('components/site/MissionSection.tsx')
    const nextEvent = readSource('components/site/NextEventSection.tsx')
    const sources = `${eventProof}\n${mission}\n${nextEvent}`

    for (const image of [
      '/images/home/family-science-night.webp',
      '/images/home/science-odyssey.webp',
      '/images/home/wildcat-carnival.webp',
    ]) expect(sources).toContain(image)
    expect(sources).toContain("alt: 'Families gathered around a table for a hands-on science activity.")
    expect(sources).toContain("alt: 'Students exploring a science demonstration together.")
    expect(sources).toContain("alt: 'Young people and volunteers doing a hands-on activity outdoors at a community event.")
  })

  it('keeps the family trust strip, plain three-step introduction, and mission content', () => {
    const page = readSource('app/page.tsx')
    const trust = readSource('components/site/TrustStrip.tsx')
    const families = readSource('components/site/FamiliesIntro.tsx')
    const mission = readSource('components/site/MissionSection.tsx')

    for (const point of ['Family-friendly', 'Hands-on learning', 'No tech experience needed']) expect(trust).toContain(point)
    for (const step of ['Choose an event', 'Show up curious', 'Build together']) expect(families).toContain(step)
    for (const copy of ['Hands-on events', 'Supportive mentorship', 'Community access']) expect(mission).toContain(copy)
    expect(families).toContain('New to tech?')
    expect(page).toContain('<EventProof />')
    expect(page).toContain('<MissionSection />')
  })

  it('keeps Georgia informational and non-linking while California remains actionable', () => {
    const branches = readSource('components/site/BranchesSection.tsx')
    expect(branches).toContain('data-branch="ga"')
    expect(branches).toContain('Details coming soon')
    expect(branches).toContain('href="/events"')
    const georgiaCard = branches.slice(branches.indexOf('branch-card--georgia'))
    expect(georgiaCard).not.toMatch(/<a\b|<Link\b/)
    expect(georgiaCard).not.toMatch(/launch/i)
  })

  it('removes the scroll-controlled rover and global atmosphere from public layout', () => {
    const page = readSource('app/page.tsx')
    const layout = readSource('app/layout.tsx')
    const css = readSource('app/globals.css')
    expect(page).not.toContain('WorkshopAssembly')
    expect(page).not.toContain('useScroll')
    expect(page).not.toContain('min-h-[320vh]')
    expect(layout).not.toContain('PublicAtmosphere')
    expect(css).not.toContain('.public-atmosphere')
  })
})
