import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

const publicHeroFiles = [
  'src/components/About.tsx',
  'src/components/Team.tsx',
  'src/components/Contact.tsx',
  'src/components/CloudinaryPhotoGallery.tsx',
  'src/app/events/page.tsx',
  'src/app/events/[id]/page.tsx',
  'src/app/volunteer/page.tsx',
  'src/app/fundraiser/page.tsx',
  'src/app/wishlist/page.tsx',
  'src/app/newsletter/page.tsx',
  'src/app/faq/page.tsx',
  'src/app/wildcat-tank/page.tsx',
  'src/app/register/[eventId]/page.tsx',
] as const

const rejectedHeroScale = /(?:sm:text-(?:7xl|8xl)|text-(?:8xl|9xl)|lg:text-6xl|text-\[(?:5\.4|5\.6)rem\])/g

describe('public hero type scale', () => {
  it('keeps public h1 surfaces below the rejected display-size ceiling', () => {
    const violations: string[] = []
    const sharedIntro = readFileSync(join(process.cwd(), 'src/components/site/SignalPageIntro.tsx'), 'utf8')
    const sharedIntroHeadings = sharedIntro.match(/<h1\b[\s\S]*?<\/h1>/g) ?? []

    expect(sharedIntroHeadings.length, 'SignalPageIntro should render the shared public h1').toBeGreaterThan(0)

    for (const relativePath of publicHeroFiles) {
      const source = readFileSync(join(process.cwd(), relativePath), 'utf8')
      const h1Blocks = source.match(/<h1\b[\s\S]*?<\/h1>/g) ?? []
      const usesSharedIntro = source.includes('<SignalPageIntro')

      expect(h1Blocks.length > 0 || usesSharedIntro, `${relativePath} should keep a public h1`).toBe(true)

      for (const block of h1Blocks) {
        const matches = block.match(rejectedHeroScale)
        if (matches) violations.push(`${relativePath}: ${matches.join(', ')}`)
      }
    }

    for (const block of sharedIntroHeadings) {
      const matches = block.match(rejectedHeroScale)
      if (matches) violations.push(`src/components/site/SignalPageIntro.tsx: ${matches.join(', ')}`)
    }

    expect(violations).toEqual([])
  })
})
