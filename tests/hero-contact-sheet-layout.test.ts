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

describe('hero visual composition', () => {
  it('keeps one real event photograph with a quiet caption and no print decoration', () => {
    const heroVisual = readSource('components/site/HeroVisual.tsx')
    const styles = readSource('app/globals.css')

    expect(heroVisual).toContain('hero-visual__frame')
    expect(heroVisual).toContain('hero-visual__caption')
    expect(heroVisual).toContain('/images/events/science-odyssey/drive-02.webp')
    expect(heroVisual.match(/src="\/images\/events\//g)?.length).toBe(1)
    expect(heroVisual).toContain('priority')
    expect(heroVisual).not.toContain('contact-sheet')
    expect(heroVisual).not.toContain('hero-registration-mark')
    expect(heroVisual).not.toContain('hero-print-shutter')

    const frame = cssBlock(styles, '.hero-visual__frame')
    expect(frame).toContain('will-change: transform')
    expect(frame).toContain('box-shadow:')

    const caption = cssBlock(styles, '.hero-visual__caption')
    expect(caption).toContain('min-height: 3.25rem')
    expect(styles).not.toContain('radial-gradient')
    expect(styles).not.toContain('hero-contact-sheet')
  })
})
