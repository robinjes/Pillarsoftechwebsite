import { readFileSync } from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

import { previewImpactSnapshot } from '@/data/impact-snapshot'

const sourceRoot = path.resolve(process.cwd(), 'src')
const readSource = (relativePath: string) => readFileSync(path.join(sourceRoot, relativePath), 'utf8')

describe('Signal Relay homepage proof surfaces', () => {
  it('keeps the three preview metrics validated, dated, and source-linked', () => {
    expect(previewImpactSnapshot).toHaveLength(3)
    expect(previewImpactSnapshot.map((metric) => metric.value)).toEqual([1_000, 223, 100])
    expect(previewImpactSnapshot.every((metric) => metric.asOf === '2026-08-18')).toBe(true)
    expect(previewImpactSnapshot[1]?.unit).toBe('USD')
    expect(previewImpactSnapshot.every((metric) => metric.sourceUrl.startsWith('https://'))).toBe(true)
    expect(previewImpactSnapshot.every((metric) => metric.methodologyNote.length > 0)).toBe(true)
  })

  it('uses eight distinct real event images and keeps the display scale bounded', () => {
    const page = readSource('app/page.tsx')
    const scanner = readSource('components/site/SignalScanner.tsx')
    const imagePaths = `${page}\n${scanner}`.match(/\/images\/events\/[^'"`\s)]+/g) ?? []

    expect(new Set(imagePaths).size).toBeGreaterThanOrEqual(8)
    expect(page).toContain('Give students the tools. <em>Watch what they build.</em>')
    expect(readSource('app/globals.css')).toContain('clamp(2.8rem, 6.3vw, 4.35rem)')
    expect(page).not.toContain('text-[5.8rem]')
    expect(page).not.toContain('text-[7.5rem]')
    for (const stage of ['QUESTION', 'BUILD', 'TEST', 'SHARE']) expect(readSource('components/site/SignalPath.tsx')).toContain(stage)
  })

  it('makes the scanner a real-image, pointer-driven, keyboard-reveal interaction', () => {
    const scanner = readSource('components/site/SignalScanner.tsx')
    const styles = readSource('app/globals.css')

    expect(scanner).toContain("'/images/events/pedrozzi-connect-egg-drop/drive-02.webp'")
    expect(scanner).toContain('onPointerMove')
    expect(scanner).toContain('setProperty')
    expect(scanner).toContain('Reveal full colour')
    expect(scanner).toContain('aria-pressed={isRevealed}')
    expect(scanner).toContain('Students sit in a school auditorium while Pillars of Tech volunteers introduce a hands-on STEM workshop.')
    expect(scanner).toContain('WORKSHOP OPENING · PEDROZZI CONNECT')
    expect(styles).toContain('.signal-scanner__image--color')
    expect(styles).toContain('clip-path: circle(18% at var(--scanner-x) var(--scanner-y))')
    expect(styles).toContain('@media (prefers-reduced-motion: reduce)')
    expect(styles).toContain('.signal-scanner__image--base { visibility: hidden; }')
  })
})
