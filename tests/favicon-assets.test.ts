import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'

import sharp from 'sharp'
import { describe, expect, it } from 'vitest'

const root = process.cwd()
const read = (relativePath: string) => readFileSync(path.join(root, relativePath), 'utf8')

const iconVersion = 'v=20260907'
const pngIcons = [
  ['public/favicon-16x16.png', 16],
  ['public/favicon-32x32.png', 32],
  ['public/apple-touch-icon.png', 180],
  ['public/android-chrome-192x192.png', 192],
  ['public/android-chrome-512x512.png', 512],
] as const

function readIcoEntries(relativePath: string) {
  const data = readFileSync(path.join(root, relativePath))
  expect(data.readUInt16LE(0)).toBe(0)
  expect(data.readUInt16LE(2)).toBe(1)

  const count = data.readUInt16LE(4)
  return Array.from({ length: count }, (_, index) => {
    const offset = 6 + index * 16
    const imageOffset = data.readUInt32LE(offset + 12)
    const bytesInRes = data.readUInt32LE(offset + 8)
    return {
      width: data[offset] || 256,
      height: data[offset + 1] || 256,
      bytesInRes,
      isPng: data.subarray(imageOffset, imageOffset + 8).equals(Buffer.from('89504e470d0a1a0a', 'hex')),
    }
  })
}

describe('versioned favicon asset contract', () => {
  it('references every favicon through cache-busted metadata and manifest URLs', () => {
    const layout = read('src/app/layout.tsx')
    const manifest = JSON.parse(read('public/site.webmanifest')) as { icons: Array<{ src: string }> }

    expect(layout).toContain(`manifest: '/site.webmanifest?${iconVersion}'`)
    for (const [, size] of pngIcons) {
      const filename = size === 16 || size === 32 ? `favicon-${size}x${size}.png` : size === 180 ? 'apple-touch-icon.png' : `android-chrome-${size}x${size}.png`
      expect(layout).toContain(`/${filename}?${iconVersion}`)
    }
    expect(layout).toContain(`/favicon.ico?${iconVersion}`)
    expect(manifest.icons.map((icon) => icon.src)).toEqual([
      `/android-chrome-192x192.png?${iconVersion}`,
      `/android-chrome-512x512.png?${iconVersion}`,
    ])
  })

  it('ships square alpha-preserving PNG sizes and a multi-size PNG-frame ICO', async () => {
    for (const [relativePath, size] of pngIcons) {
      expect(existsSync(path.join(root, relativePath)), relativePath).toBe(true)
      const metadata = await sharp(path.join(root, relativePath)).metadata()
      expect(metadata.width, relativePath).toBe(size)
      expect(metadata.height, relativePath).toBe(size)
      expect(metadata.channels, relativePath).toBe(4)
      expect(metadata.hasAlpha, relativePath).toBe(true)
    }

    expect(existsSync(path.join(root, 'public/favicon.ico'))).toBe(true)
    const entries = readIcoEntries('public/favicon.ico')
    expect(entries).toHaveLength(3)
    expect(entries.map(({ width, height }) => [width, height])).toEqual([[16, 16], [32, 32], [48, 48]])
    expect(entries.every(({ bytesInRes, isPng }) => bytesInRes > 0 && isPng)).toBe(true)
  })
})
