import { existsSync } from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

describe('retired scroll rover assets', () => {
  it('does not ship the obsolete workshop assembly implementation or model', () => {
    const root = process.cwd()
    for (const relativePath of [
      'src/components/site/WorkshopAssembly.tsx',
      'src/components/site/WorkshopAssemblyDesktop.tsx',
      'src/components/site/WorkshopAssemblyDesktopLoader.tsx',
      'src/components/site/workshopAssemblyData.ts',
      'public/models/perseverance/perseverance-runtime.glb',
    ]) {
      expect(existsSync(path.join(root, relativePath)), relativePath).toBe(false)
    }
  })
})
