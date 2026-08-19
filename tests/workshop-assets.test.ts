import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

describe('Workshop Assembly generated assets', () => {
  it('keeps the retired raster robot states out of the project', () => {
    const workshopDirectory = join(process.cwd(), 'public', 'images', 'workshop')
    const remainingFiles = existsSync(workshopDirectory) ? readdirSync(workshopDirectory) : []
    const provenance = readFileSync(join(process.cwd(), 'docs', 'workshop-assembly-assets.md'), 'utf8')
    const scene = readFileSync(
      join(process.cwd(), 'src', 'components', 'site', 'WorkshopAssemblyDesktop.tsx'),
      'utf8',
    )

    expect(remainingFiles).toEqual([])
    expect(provenance).toContain('No generated workshop raster imagery remains')
    expect(scene).toContain('RoundedBoxGeometry')
    expect(scene).not.toContain('/images/workshop/')
  })
})
