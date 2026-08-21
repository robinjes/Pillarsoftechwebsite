import { readFileSync } from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

const sourceRoot = path.resolve(process.cwd(), 'src')
const readSource = (relativePath: string) => readFileSync(path.join(sourceRoot, relativePath), 'utf8')

function cssBlock(styles: string, selector: string) {
  const start = styles.indexOf(`${selector} {`)
  expect(start).toBeGreaterThanOrEqual(0)
  const end = styles.indexOf('}', start)
  expect(end).toBeGreaterThan(start)
  return styles.slice(start, end)
}

describe('hero contact-sheet caption band', () => {
  it('reserves caption space and keeps decorations on their own side of the captions', () => {
    const heroVisual = readSource('components/site/HeroVisual.tsx')
    const styles = readSource('app/globals.css')

    expect(heroVisual).toContain('hero-contact-sheet-frame')
    expect(heroVisual).toContain('hero-contact-sheet-caption')

    const frame = cssBlock(styles, '.hero-contact-sheet-frame')
    expect(frame).toContain('--hero-contact-sheet-caption-band:')
    expect(frame).toContain('padding-bottom: var(--hero-contact-sheet-caption-band)')

    const caption = cssBlock(styles, '.hero-contact-sheet-caption')
    expect(caption).toContain('position: absolute')
    expect(caption).toContain('z-index: 2')

    const shutter = cssBlock(styles, '.hero-print-shutter--bottom')
    expect(shutter).toContain('bottom: calc(var(--hero-contact-sheet-caption-band) -')

    const registration = cssBlock(styles, '.hero-registration-mark--bottom-left,\n.hero-registration-mark--bottom-right')
    expect(registration).toContain('bottom: calc(var(--hero-contact-sheet-caption-band) -')

    const leftCut = cssBlock(styles, '.hero-cut-mark--left')
    const rightCut = cssBlock(styles, '.hero-cut-mark--right')
    expect(leftCut).toMatch(/left:\s*-/)
    expect(rightCut).toMatch(/right:\s*-/)
  })
})
