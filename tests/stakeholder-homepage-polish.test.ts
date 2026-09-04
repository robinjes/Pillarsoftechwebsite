import { readFileSync } from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

const root = process.cwd()
const read = (relativePath: string) => readFileSync(path.join(root, relativePath), 'utf8')

describe('stakeholder homepage polish', () => {
  it('ends the homepage with contact followed by finance', () => {
    const page = read('src/app/page.tsx')

    expect(page.indexOf('<ContactCta />')).toBeGreaterThan(-1)
    expect(page.indexOf('<FinanceSection />')).toBeGreaterThan(-1)
    expect(page.indexOf('<ContactCta />')).toBeLessThan(page.indexOf('<FinanceSection />'))
  })

  it('uses the exact family audience copy without visible photo captions', () => {
    const nextEvent = read('src/components/site/NextEventSection.tsx')
    const eventProof = read('src/components/site/EventProof.tsx')
    const photoSections = `${nextEvent}\n${eventProof}`

    expect(nextEvent).toContain('8th-12th graders and their families')
    expect(photoSections).not.toContain('photo-note')
    expect(photoSections).not.toContain('figcaption')
    expect(photoSections).not.toContain('caption:')
  })

  it('shows only sourced visible metrics without an expandable methodology disclosure', () => {
    const impact = read('src/components/site/ImpactSection.tsx')

    expect(impact).toContain("const visibleMetrics = metrics.filter((metric) => metric.key !== 'hcb_revenue')")
    expect(impact).toContain('visibleMetrics.map((metric) =>')
    expect(impact).not.toContain('metric.methodologyNote')
    expect(impact).not.toContain('metric.sourceUrl')
    expect(impact).not.toContain('impact-method')
    expect(impact).not.toContain('How We Count Impact')
    expect(impact).not.toContain('View Source')

    const cardMarkup = impact.match(/<article className="impact-card"[\s\S]*?<\/article>/)?.[0] ?? ''
    expect(cardMarkup).not.toContain('impact-method')
    expect(cardMarkup).not.toContain('impact-source')
  })

  it('uses the stakeholder palette and layout constraints', () => {
    const css = read('src/app/globals.css')
    const trustStrip = css.match(/\.trust-strip\s*\{[^}]*\}/)?.[0] ?? ''
    const contactPanel = css.match(/\.contact-panel\s*\{[^}]*\}/)?.[0] ?? ''

    expect(css).toMatch(/\.hero\s*\{[\s\S]*?min-height:\s*100svh;/)
    expect(css).toMatch(/\.trust-strip\s*\{[\s\S]*?background:\s*var\(--sky\);/)
    expect(css).toMatch(/\.contact-panel\s*\{[\s\S]*?background:\s*var\(--sky\);/)
    expect(css).toMatch(/\.impact-grid\s*\{[\s\S]*?grid-template-columns:\s*repeat\(2,/)
    expect(css).toMatch(/\.finance-layout\s*\{[\s\S]*?align-items:\s*center;/)
    expect(css).toMatch(/\.friendly-card\s*\{[\s\S]*?border:\s*2px solid var\(--navy-950\);/)
    expect(css).toMatch(/\.friendly-card--(?:sky|peach|green)\s*\{[\s\S]*?background:\s*var\(--paper\);/)
    expect(css).toMatch(/\.branch-card--georgia\s*\{[\s\S]*?background:\s*var\(--paper\);[\s\S]*?border:\s*2px solid var\(--sky\);/)
    expect(trustStrip).not.toContain('background: var(--sun)')
    expect(contactPanel).not.toContain('background: var(--sun)')
  })
})
