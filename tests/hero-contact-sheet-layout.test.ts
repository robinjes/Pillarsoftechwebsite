import { readFileSync } from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

const sourceRoot = path.resolve(process.cwd(), 'src')
const readSource = (relativePath: string) => readFileSync(path.join(sourceRoot, relativePath), 'utf8')

describe('Signal scanner layout contract', () => {
  it('keeps the full-colour layer clipped by the pointer position and provides a stable reduced-motion state', () => {
    const scanner = readSource('components/site/SignalScanner.tsx')
    const styles = readSource('app/globals.css')

    expect(scanner).toContain('data-signal-scanner')
    expect(scanner).toContain('onPointerMove')
    expect(scanner).toContain('onPointerDown')
    expect(scanner).toContain('setProperty')
    expect(scanner).toContain('Reveal full colour')
    expect(styles).toContain('--scanner-x: 50%')
    expect(styles).toContain('--scanner-y: 50%')
    expect(styles).toContain('clip-path: circle(18% at var(--scanner-x) var(--scanner-y))')
    expect(styles).toContain('.signal-scanner--revealed .signal-scanner__image--color')
    expect(styles).toContain('.signal-scanner__image--base { visibility: hidden; }')
  })
})
