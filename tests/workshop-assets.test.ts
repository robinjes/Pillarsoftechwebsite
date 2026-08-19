import { createHash } from 'node:crypto'
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

describe('Workshop Assembly model assets', () => {
  it('keeps the retired raster robot states out of the project', () => {
    const workshopDirectory = join(process.cwd(), 'public', 'images', 'workshop')
    const remainingFiles = existsSync(workshopDirectory) ? readdirSync(workshopDirectory) : []
    const provenance = readFileSync(join(process.cwd(), 'docs', 'workshop-assembly-assets.md'), 'utf8')
    const scene = readFileSync(
      join(process.cwd(), 'src', 'components', 'site', 'WorkshopAssemblyDesktop.tsx'),
      'utf8',
    )
    const middleware = readFileSync(join(process.cwd(), 'src', 'middleware.ts'), 'utf8')

    expect(remainingFiles).toEqual([])
    expect(provenance).toContain('No generated workshop raster imagery')
    expect(scene).toContain('GLTFLoader')
    expect(scene).toContain('/models/perseverance/perseverance-runtime.glb')
    expect(scene).not.toContain('DRACOLoader')
    expect(scene).not.toContain('/images/workshop/')
    expect(middleware).toContain("`connect-src 'self' blob:${supabaseSource}`")
    expect(provenance).toContain('local `blob:` URLs')
  })

  it('ships only the decoded runtime model and records reproducible provenance', () => {
    const runtimePath = join(process.cwd(), 'public', 'models', 'perseverance', 'perseverance-runtime.glb')
    const sourcePath = join(process.cwd(), 'public', 'models', 'perseverance', 'perseverance.glb')
    const provenance = readFileSync(join(process.cwd(), 'docs', 'workshop-assembly-assets.md'), 'utf8')
    const runtime = readFileSync(runtimePath)

    expect(existsSync(runtimePath)).toBe(true)
    expect(existsSync(sourcePath)).toBe(false)
    expect(statSync(runtimePath).size).toBe(8_129_008)
    expect(createHash('sha256').update(runtime).digest('hex')).toBe(
      'a7527d095007d81627e310579273027fb13d707c6bc0b756b37525aac9013496',
    )
    expect(provenance).toContain('https://science.nasa.gov/3d-resources/mars-2020-perseverance-rover/')
    expect(provenance).toContain('10db7c03a5e63a5a3b3e7baa6243aa4918ba045fa8ff0a731d0217491adc727f')
    expect(provenance).toContain('a7527d095007d81627e310579273027fb13d707c6bc0b756b37525aac9013496')
    expect(provenance).toContain('not affiliated with, sponsored by, or endorsed by NASA')

    // The JSON chunk is ASCII/UTF-8 in a GLB; checking it protects the no-worker/no-WASM CSP choice.
    const jsonChunk = runtime.subarray(20, 20 + runtime.readUInt32LE(12)).toString('utf8')
    expect(jsonChunk).not.toContain('KHR_draco_mesh_compression')
  })
})
