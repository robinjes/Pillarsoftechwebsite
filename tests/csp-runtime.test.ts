import { readFileSync } from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

describe('CSP nonce runtime contract', () => {
  it('keeps the root document dynamic so Next can nonce framework output', () => {
    const source = readFileSync(path.resolve(process.cwd(), 'src/app/layout.tsx'), 'utf8')

    expect(source).toContain("import { connection } from 'next/server'")
    expect(source).toMatch(/export default async function RootLayout\(/)
    expect(source).toContain('await connection()')
  })
})
