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
    const familyStory = readSource('components/site/FamilyScienceStory.tsx')
    const imagePaths = `${page}\n${heroVisual}\n${eventProof}\n${familyStory}`.match(/\/images\/events\/[^'"`\s)]+/g) ?? []

    expect(new Set(imagePaths).size).toBeGreaterThanOrEqual(8)
    expect(page).toContain('text-[5.8rem]')
    expect(page).not.toContain('text-[7.5rem]')
    expect(eventProof.match(/src: '\/images\/events/g)?.length).toBe(4)
    expect(familyStory.match(/src=\"\/images\/events/g)?.length).toBe(2)
    expect(eventProof).toContain('motion-reduce:transform-none')
    expect(eventProof).toContain('motion-reduce:transition-none')
    expect(heroVisual).toContain("clipPath: 'inset(0 100% 0 0)'")
    expect(heroVisual).toContain('drive-02.webp')
    expect(heroVisual).toContain('drive-04.webp')
  })
})
