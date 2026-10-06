import { createHash } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import sharp from 'sharp'
import { describe, expect, it } from 'vitest'

const events = JSON.parse(readFileSync(join(process.cwd(), 'src/data/events.json'), 'utf8')) as Array<{
  id: string
  date: string
  location: string
  image?: string
  heroImage?: string
  gallery?: string[]
  imageAlt?: string
  heroImageAlt?: string
  galleryAlts?: string[]
}>
const review = JSON.parse(readFileSync(join(process.cwd(), 'docs/stockmens-park-2026-photo-review.json'), 'utf8')) as {
  version: number
  previewOnly: boolean
  approvalSource: string
  approvalDate: string
  reviewNote: string
  records: Array<{
    eventId: string
    sourceFilename: string
    sourceSha256: string
    outputPath: string
    outputSha256: string
    mappingBasis: string
    location: string
    locationSource: string
    permissionStatus: string
    metadataStripped: boolean
    captureDate: string
  }>
}

const paths = [
  '/images/events/science-at-stockmens-park-2026/drive-01.webp',
  '/images/events/science-at-stockmens-park-2026/drive-02.webp',
  '/images/events/science-at-stockmens-park-2026/drive-03.webp',
  '/images/events/science-at-stockmens-park-2026/drive-04.webp',
]
const alts = [
  'Children and adults gather around the Pillars of Tech activity table at Stockmen’s Park.',
  'A student lowers a coin toward a foil boat in a clear water tub.',
  'Two students examine a foil boat in a water tub as an adult points toward it.',
  'Participants gather around water tubs and coins at the outdoor activity table.',
]
const diskPath = (assetPath: string) => join(process.cwd(), 'public', assetPath.replace(/^\/+/, ''))
const hashFile = (path: string) => createHash('sha256').update(readFileSync(path)).digest('hex')

describe('2026 Stockmen’s Park photo review', () => {
  it('wires the selected gallery and records dated user approval', () => {
    const event = events.find((candidate) => candidate.id === 'science-at-stockmens-park-2026')
    expect(event).toBeDefined()
    expect(event).toMatchObject({
      date: 'October 3, 2026',
      location: 'Stockmen’s Park',
      image: paths[0],
      heroImage: paths[0],
      gallery: paths,
      imageAlt: alts[0],
      heroImageAlt: alts[0],
      galleryAlts: alts,
    })
    expect(review.version).toBe(1)
    expect(review.previewOnly).toBe(false)
    expect(review.approvalSource).toBe('User confirmation in this task')
    expect(review.approvalDate).toBe('2026-10-05')
    expect(review.reviewNote).toContain('Approved for public website use')
    expect(review.reviewNote).toContain('parental permissions')
    expect(review.records).toHaveLength(paths.length)
    expect(review.records.map((record) => record.eventId)).toEqual(Array(paths.length).fill('science-at-stockmens-park-2026'))
    expect(review.records.map((record) => record.outputPath)).toEqual(paths)

    for (const record of review.records) {
      expect(record.sourceFilename).toMatch(/^IMG_[0-9]+\.DNG$/)
      expect(record.captureDate).toBe('2026-10-03')
      expect(record.mappingBasis).toContain('capture date')
      expect(record.location).toBe('Stockmen’s Park')
      expect(record.locationSource).toContain('no embedded GPS')
      expect(record.permissionStatus).toBe('approved-for-public-use')
      expect(record.metadataStripped).toBe(true)
      expect(record).not.toHaveProperty('sourceId')
      expect(record).not.toHaveProperty('sourceUrl')
      expect(record).not.toHaveProperty('captureTimestamp')
      expect(record).not.toHaveProperty('gps')
      expect(record.sourceSha256).toMatch(/^[a-f0-9]{64}$/)
      expect(record.outputSha256).toMatch(/^[a-f0-9]{64}$/)
    }

    const serializedReview = JSON.stringify(review)
    expect(serializedReview).not.toContain('drive.google.com')
    expect(serializedReview).not.toMatch(/\b\d{2}:\d{2}:\d{2}\b/)
  })

  it('uses compact, decodable WebPs with no embedded metadata', async () => {
    for (const record of review.records) {
      const path = diskPath(record.outputPath)
      expect(existsSync(path)).toBe(true)
      const metadata = await sharp(path).metadata()
      expect(metadata.format).toBe('webp')
      expect(metadata.width).toBeLessThanOrEqual(1600)
      expect(metadata.height).toBeLessThanOrEqual(1600)
      expect(metadata.exif).toBeUndefined()
      expect(metadata.xmp).toBeUndefined()
      expect(metadata.icc).toBeUndefined()
      expect(metadata.iptc).toBeUndefined()
      expect(readFileSync(path).byteLength).toBeLessThanOrEqual(600_000)
      expect(hashFile(path)).toBe(record.outputSha256)
    }
  })
})
