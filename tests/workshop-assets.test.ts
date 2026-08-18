import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import sharp from 'sharp'
import { describe, expect, it } from 'vitest'

const assets = {
  access: 'c4c65e776095ae11b58158b76f8e954676c1ddcdeee65a8332d5445c293480ed',
  build: 'a31660fdcac85cbb7bb3a4519a741dbfc29378a28ba39d40c2d49e65956b0655',
  lead: '95660497e3d5dc7ce99ee0b7e3e943d994569e35648c8047eb7c37bc7b275521',
} as const

describe('Workshop Assembly generated assets', () => {
  it('keeps the three bounded, metadata-free object states pinned to reviewed hashes', async () => {
    for (const [state, expectedHash] of Object.entries(assets)) {
      const path = join(process.cwd(), 'public', 'images', 'workshop', `${state}.webp`)
      const bytes = readFileSync(path)
      const metadata = await sharp(bytes).metadata()

      expect(metadata.format).toBe('webp')
      expect(metadata.width).toBe(627)
      expect(metadata.height).toBe(627)
      expect(bytes.byteLength).toBeLessThan(150_000)
      expect(metadata.exif).toBeUndefined()
      expect(metadata.xmp).toBeUndefined()
      expect(metadata.icc).toBeUndefined()
      expect(metadata.iptc).toBeUndefined()
      expect(createHash('sha256').update(bytes).digest('hex')).toBe(expectedHash)
    }
  })
})
