import { readFileSync } from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

import { previewImpactSnapshot } from '@/data/impact-snapshot'

const sourceRoot = path.resolve(process.cwd(), 'src')
const readSource = (relativePath: string) => readFileSync(path.join(sourceRoot, relativePath), 'utf8')

describe('image-led homepage proof surfaces', () => {
  it('keeps the three preview metrics validated, dated, and source-linked', () => {
    expect(previewImpactSnapshot).toHaveLength(3)
    expect(previewImpactSnapshot.map((metric) => metric.value)).toEqual([1_000, 223, 100])
    expect(previewImpactSnapshot.every((metric) => metric.asOf === '2026-08-18')).toBe(true)
    expect(previewImpactSnapshot[1]?.unit).toBe('USD')
    expect(previewImpactSnapshot.every((metric) => metric.sourceUrl.startsWith('https://'))).toBe(true)
    expect(previewImpactSnapshot.every((metric) => metric.methodologyNote.length > 0)).toBe(true)
  })

  it('keeps real event photography and a bounded hero scale', () => {
    const page = readSource('app/page.tsx')
    const heroVisual = readSource('components/site/HeroVisual.tsx')
    const eventProof = readSource('components/site/EventProof.tsx')
    const eventProofPhoto = readSource('components/site/EventProofPhoto.tsx')
    const familyStory = readSource('components/site/FamilyScienceStory.tsx')
    const imagePaths = `${page}\n${heroVisual}\n${eventProof}\n${familyStory}`.match(/\/images\/events\/[^'"`\s)]+/g) ?? []

    expect(new Set(imagePaths).size).toBeGreaterThanOrEqual(8)
    expect(page).toContain('lg:text-[4.35rem]')
    expect(page).not.toContain('text-[5.8rem]')
    expect(page).not.toContain('text-[7.5rem]')
    for (const detail of ['Choose a problem.', 'Make a prototype.', 'Try it, notice, adjust.', 'Teach it forward.']) {
      expect(page).toContain(detail)
    }
    expect(eventProof.match(/src: '\/images\/events/g)?.length).toBe(4)
    expect(familyStory.match(/src=\"\/images\/events/g)?.length).toBe(2)
    expect(eventProofPhoto).toContain('motion-reduce:transform-none')
    expect(eventProofPhoto).toContain('motion-reduce:transition-none')
    expect(heroVisual).toContain('data-hero-contact-sheet')
    expect(heroVisual).toContain('hero-registration-mark')
    expect(heroVisual).toContain('hero-print-shutter')
    expect(heroVisual).toContain('reducedMotion ? undefined')
    expect(heroVisual).not.toContain('repeat: Infinity')
    expect(heroVisual).not.toContain('Real rooms / real questions')
    expect(heroVisual).toContain('drive-02.webp')
    expect(heroVisual).toContain('drive-04.webp')
  })

  it('keeps the public print atmosphere scoped away from protected routes', () => {
    const layout = readSource('app/layout.tsx')
    const atmosphere = readSource('components/site/PublicAtmosphere.tsx')
    const navbar = readSource('components/Navbar.tsx')
    const styles = readSource('app/globals.css')

    expect(layout).toContain("import PublicAtmosphere from '@/components/site/PublicAtmosphere'")
    expect(layout).toContain('<PublicAtmosphere />')
    expect(navbar).toContain('Student-led STEM workshops')
    expect(atmosphere).toContain("pathname.startsWith('/admin')")
    expect(atmosphere).toContain("pathname.startsWith('/volunteer/checkin')")
    expect(styles).toContain('pointer-events: none')
    expect(styles).toContain('z-index: 40')
    expect(styles).toContain('opacity: 0.08')
    expect(styles).toContain('width: 1.25rem')
    expect(styles).toContain('@media (max-width: 1023px)')
    expect(styles).toContain('.public-atmosphere__dots')
    expect(styles).toContain('radial-gradient(circle, currentColor')
  })

  it('keeps the field-note, audience-role, and assembly readouts content-bearing', () => {
    const eventProof = readSource('components/site/EventProof.tsx')
    const eventProofPhoto = readSource('components/site/EventProofPhoto.tsx')
    const audiences = readSource('components/site/AudienceRoutes.tsx')
    const assembly = readSource('components/site/WorkshopAssemblyDesktop.tsx')
    const styles = readSource('app/globals.css')

    expect(eventProof).toContain('EventProofPhoto')
    expect(eventProofPhoto).toContain('data-field-photo')
    expect(eventProofPhoto).toContain('Field note')
    expect(eventProofPhoto).toContain('useScroll')
    expect(eventProofPhoto).toContain("duration: 0.24, ease: 'easeOut'")
    expect(eventProofPhoto).not.toContain('type: \'spring\'')
    for (const role of ['BUILDERS', 'CREW', 'HOSTS', 'BACKERS']) expect(audiences).toContain(role)
    expect(audiences).not.toContain('0{index + 1}')
    expect(assembly).toContain('workshop-stage-readout')
    expect(assembly).toContain('workshop-stage-readout__marker')
    expect(assembly).toContain('lg:text-5xl')
    expect(assembly).not.toContain('lg:text-6xl')
    expect(assembly).toContain('workshop-registration-layer')
    expect(assembly).not.toContain('radial-gradient')
    expect(styles).toContain('.workshop-stage-readout__marker')
    expect(styles).not.toMatch(/\.workshop-stage-readout__item\s*\{[^}]*border-top/)
    expect(styles).not.toMatch(/\.workshop-stage-readout__item\[data-active='true'\]\s*\{[^}]*background/)
  })
})
