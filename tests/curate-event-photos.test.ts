import { execFile as execFileCallback } from 'node:child_process'
import { copyFile, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { promisify } from 'node:util'
import sharp from 'sharp'
import { afterEach, describe, expect, it } from 'vitest'

import { curateEventPhotos } from '../scripts/curate-event-photos.mjs'

const execFile = promisify(execFileCallback)
const scriptPath = resolve(process.cwd(), 'scripts/curate-event-photos.mjs')
const temporaryRoots: string[] = []

async function makeRoot() {
  const root = await mkdtemp(join(tmpdir(), 'pot-photo-triage-'))
  temporaryRoots.push(root)
  return root
}

async function jpegPattern({ reverse = false, offset = 0, seed = 0 } = {}) {
  const width = 24
  const height = 16
  const pixels = Buffer.alloc(width * height * 3)
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const position = y * width + x
      const value = reverse
        ? 255 - Math.min(255, x * 10 + offset)
        : seed
          ? (x * 17 + y * 29 + seed * 13) % 256
          : Math.min(255, x * 10 + offset)
      pixels[position * 3] = value
      pixels[position * 3 + 1] = Math.min(255, value + 8)
      pixels[position * 3 + 2] = Math.max(0, value - 8)
    }
  }
  return sharp(pixels, { raw: { width, height, channels: 3 } }).jpeg({ quality: 95 }).toBuffer()
}

afterEach(async () => {
  await Promise.all(temporaryRoots.splice(0).map((root) => rm(root, { recursive: true, force: true })))
})

describe('event photo triage utility', () => {
  it('naturally sorts, records deterministic hashes, groups duplicates, and paginates metadata-free sheets', async () => {
    const root = await makeRoot()
    const inputDir = join(root, 'input')
    const outputDir = join(root, 'output')
    const repeatOutputDir = join(root, 'output-repeat')
    await mkdir(inputDir)

    const base = await jpegPattern()
    await writeFile(join(inputDir, 'frame10.jpg'), await jpegPattern({ offset: 1 }))
    await writeFile(join(inputDir, 'frame2.jpg'), base)
    await copyFile(join(inputDir, 'frame2.jpg'), join(inputDir, 'frame2-copy.jpg'))
    await writeFile(join(inputDir, 'frame1.jpg'), await jpegPattern({ reverse: true }))
    for (let index = 3; index <= 26; index += 1) {
      await writeFile(join(inputDir, `gallery-${index}.jpg`), await jpegPattern({ seed: index }))
    }

    const first = await curateEventPhotos({ inputDir, outputDir, eventLabel: 'STEM Night / Spring' })
    const second = await curateEventPhotos({ inputDir, outputDir: repeatOutputDir, eventLabel: 'STEM Night / Spring' })
    const imageOrder = first.report.images.map((image) => image.filename)

    expect(first.report.eventLabel).toBe('STEM Night / Spring')
    expect(first.report.imageCount).toBe(28)
    expect(imageOrder.slice(0, 4)).toEqual(['frame1.jpg', 'frame2.jpg', 'frame2-copy.jpg', 'frame10.jpg'])
    expect(first.report.images[0]).toMatchObject({ width: 24, height: 16 })
    expect(first.report.images.every((image) => /^[0-9a-f]{64}$/.test(image.sha256))).toBe(true)
    expect(first.report.images.every((image) => /^[0-9a-f]{16}$/.test(image.dHash))).toBe(true)
    expect(first.report.exactDuplicateGroups).toEqual([
      expect.objectContaining({ filenames: ['frame2.jpg', 'frame2-copy.jpg'] }),
    ])

    const nearGroup = first.report.nearDuplicateGroups.find((group) => group.filenames.includes('frame2.jpg') && group.filenames.includes('frame10.jpg'))
    expect(nearGroup).toBeDefined()
    expect(nearGroup?.maxHammingDistance).toBeLessThanOrEqual(4)
    expect(first.report.contactSheets).toMatchObject({ columns: 5, rows: 5, pageSize: 25 })
    expect(first.report.contactSheets.pages).toHaveLength(2)
    expect(first.report.contactSheets.pages[0].filename).toBe('stem-night-spring-contact-sheet-001.png')

    const sheetBytes = await readFile(first.contactSheetPaths[0])
    const sheetMetadata = await sharp(sheetBytes).metadata()
    expect(sheetMetadata.exif).toBeUndefined()
    expect(sheetMetadata.iptc).toBeUndefined()
    expect(sheetMetadata.xmp).toBeUndefined()
    expect(JSON.stringify(first.report)).toBe(JSON.stringify(second.report))
    expect(await readFile(first.reportPath)).toEqual(await readFile(second.reportPath))
    expect(await readFile(first.contactSheetPaths[0])).toEqual(await readFile(second.contactSheetPaths[0]))
  })

  it('rejects missing, empty, and non-image input with bounded errors', async () => {
    const root = await makeRoot()
    const outputDir = join(root, 'output')
    await expect(curateEventPhotos({ inputDir: join(root, 'missing'), outputDir, eventLabel: 'Missing' })).rejects.toThrow('Input directory not found')

    const emptyDir = join(root, 'empty')
    await mkdir(emptyDir)
    await expect(curateEventPhotos({ inputDir: emptyDir, outputDir, eventLabel: 'Empty' })).rejects.toThrow('No JPEG previews found')

    const invalidDir = join(root, 'invalid')
    await mkdir(invalidDir)
    await writeFile(join(invalidDir, 'broken.jpg'), 'not an image')
    await expect(curateEventPhotos({ inputDir: invalidDir, outputDir, eventLabel: 'Invalid' })).rejects.toThrow('Unable to decode JPEG preview "broken.jpg"')
  })

  it('runs through the documented CLI flags without network or source-file output', async () => {
    const root = await makeRoot()
    const inputDir = join(root, 'input')
    const outputDir = join(root, 'output')
    await mkdir(inputDir)
    await writeFile(join(inputDir, 'preview.jpg'), await jpegPattern({ seed: 7 }))

    const { stdout } = await execFile(process.execPath, [scriptPath, '--input', inputDir, '--output', outputDir, '--event', 'CLI smoke'])
    expect(stdout).toContain('Curated 1 JPEG preview(s)')
    const outputFiles = (await readdir(outputDir)).sort()
    expect(outputFiles).toEqual(['cli-smoke-contact-sheet-001.png', 'cli-smoke-photo-triage.json'])
    expect(outputFiles).not.toContain('preview.jpg')
  })
})
