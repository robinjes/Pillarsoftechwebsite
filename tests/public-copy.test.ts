import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const publicSourceFiles = [
  'src/components/About.tsx',
  'src/components/Contact.tsx',
  'src/app/wishlist/page.tsx',
]

function readPublicCopy(relativePath: string) {
  return readFileSync(join(process.cwd(), relativePath), 'utf8')
}

describe('security-release public copy', () => {
  it('does not ship retired claims or the former partner section', () => {
    const sources = Object.fromEntries(publicSourceFiles.map((file) => [file, readPublicCopy(file)]))
    const publicCopy = Object.values(sources).join('\n')
    const retiredClaims = [
      /1000\s*\+/i,
      /100\s*\+/i,
      /['"]100%['"]/i,
      /students reached/i,
      /students empowered/i,
      /volunteer hours/i,
      /partner organizations/i,
      /our partners/i,
      /\b2026\b/i,
      /501\s*\(\s*c\s*\)\s*\(\s*3\s*\)/i,
      /tax-deductible/i,
      /no overhead/i,
      /all donations go directly/i,
      /within 24 hours/i,
      /within one business day/i,
      /student-run nonprofit/i,
    ]

    for (const retiredClaim of retiredClaims) {
      expect(publicCopy).not.toMatch(retiredClaim)
    }

    expect(sources['src/components/About.tsx']).not.toMatch(/partnerOrganizations|our partners/i)
    expect(publicCopy).toContain('Fiscally sponsored through Hack Club')
    expect(publicCopy).toContain('https://hcb.hackclub.com/pillars-of-tech/transactions')
    expect(publicCopy).not.toContain('https://hcb.hackclub.com/pillars-of-tech/transparency')
  })

  it('keeps event stories while removing formal partnership claims', () => {
    const events = JSON.parse(readFileSync(join(process.cwd(), 'src/data/events.json'), 'utf8')) as Array<{
      description?: string
    }>
    const descriptions = events.map((event) => event.description ?? '').join('\n')

    expect(descriptions).not.toMatch(/\bpartner(?:ed|ship|ships)?\b/i)
    expect(descriptions).toContain('Egg Drop Competition')
    expect(descriptions).toContain('student-built VEX robots')
  })
})
