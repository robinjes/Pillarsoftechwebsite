import { createHash } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import sharp from 'sharp'
import { describe, expect, it } from 'vitest'

type EventRecord = {
  id: string
  image?: string
  heroImage?: string
  gallery?: string[]
  imageAlt?: string
  heroImageAlt?: string
  galleryAlts?: string[]
  location: string
}

type ReviewRecord = {
  eventId: string
  sourceFilename: string
  captureDate: string
  sourceSha256: string
  outputPath: string
  outputSha256: string
  mappingBasis: string
  location: string
  locationSource: string
  permissionStatus: string
  metadataStripped: boolean
}

const events = JSON.parse(readFileSync(join(process.cwd(), 'src/data/events.json'), 'utf8')) as EventRecord[]
const review = JSON.parse(readFileSync(join(process.cwd(), 'docs/event-photo-review.json'), 'utf8')) as {
  version: number
  previewOnly: boolean
  records: ReviewRecord[]
}

const expected = {
  'foil-boat-stockmens': {
    location: 'Stockmens Park',
    paths: [
      '/images/events/foil-boat-stockmens/drive-01.webp',
      '/images/events/foil-boat-stockmens/drive-02.webp',
      '/images/events/foil-boat-stockmens/drive-03.webp',
    ],
    alts: [
      'People stand beside the outdoor Build-a-Boat Competition table at Stockmens Park.',
      'Students gather around water tubs to test hand-built foil boats at Stockmens Park.',
      'An older student helps children test a foil boat in a water tub.',
    ],
  },
  'pedrozzi-connect-egg-drop': {
    location: 'Pedrozzi CONNECT',
    paths: [
      '/images/events/pedrozzi-connect-egg-drop/drive-01.webp',
      '/images/events/pedrozzi-connect-egg-drop/drive-02.webp',
      '/images/events/pedrozzi-connect-egg-drop/drive-03.webp',
      '/images/events/pedrozzi-connect-egg-drop/drive-04.webp',
    ],
    alts: [
      'Students watch an egg-drop test on a grassy field at Pedrozzi CONNECT.',
      'Students sit facing the stage during the Pedrozzi CONNECT Egg Drop introduction.',
      'Two students assemble protective materials for an egg-drop container.',
      'A group of student organizers gathers outdoors after the Pedrozzi CONNECT Egg Drop.',
    ],
  },
  'science-odyssey': {
    location: 'Joe Michell K-8',
    paths: [
      '/images/events/science-odyssey/drive-01.webp',
      '/images/events/science-odyssey/drive-02.webp',
      '/images/events/science-odyssey/drive-03.webp',
    ],
    alts: [
      'Students crowd around an outdoor table building marshmallow structures at Science Odyssey.',
      'Students compare and test marshmallow structures at the Science Odyssey table.',
      'Completed marshmallow structures rest on engineering challenge sheets.',
    ],
  },
  'wildcat-tank-altamont': {
    location: 'Altamont Creek Elementary School (MPR)',
    paths: [
      '/images/events/wildcat-tank-altamont/drive-01.webp',
      '/images/events/wildcat-tank-altamont/drive-02.webp',
      '/images/events/wildcat-tank-altamont/drive-03.webp',
    ],
    alts: [
      'A student presents a project board to the Wildcat Tank judging panel.',
      'Wildcat Tank judges listen during a student presentation.',
      'Student organizers pose beneath the Wildcat Tank presentation screen.',
    ],
  },
  'family-science-night-altamont': {
    location: 'Altamont Creek Elementary School',
    paths: [
      '/images/events/family-science-night-altamont/drive-01.webp',
      '/images/events/family-science-night-altamont/drive-02.webp',
      '/images/events/family-science-night-altamont/drive-03.webp',
      '/images/events/family-science-night-altamont/drive-04.webp',
    ],
    alts: [
      'Students drive VEX robots through a taped floor course at Family Science Night.',
      'An older student demonstrates a VEX robot to three younger students.',
      'An older student helps a child guide a robot through the floor course.',
      'An older student shows a child how to control a VEX robot.',
    ],
  },
  'wildcat-carnival': {
    location: 'Altamont Creek Elementary School',
    paths: [
      '/images/events/wildcat-carnival/drive-01.webp',
      '/images/events/wildcat-carnival/drive-02.webp',
      '/images/events/wildcat-carnival/drive-03.webp',
      '/images/events/wildcat-carnival/drive-04.webp',
      '/images/events/wildcat-carnival/drive-05.webp',
    ],
    alts: [
      'A crowd gathers around the outdoor Oobleck demonstration at Wildcat Carnival.',
      'Children mix Oobleck in colorful bowls at an outdoor science table.',
      'A student facilitator guides children through the Oobleck activity.',
      'Hands lift stretching Oobleck from a pink bowl.',
      'Two student facilitators stand at the Oobleck activity table in late-afternoon light.',
    ],
  },
} as const

const hashFile = (path: string) => createHash('sha256').update(readFileSync(path)).digest('hex')
const diskPath = (assetPath: string) => join(process.cwd(), 'public', assetPath.replace(/^\/+/, ''))

describe('Drive event photo review wiring', () => {
  it('keeps the six selected event galleries and alt text arrays parallel', () => {
    expect(review.version).toBe(1)
    expect(review.previewOnly).toBe(true)
    expect(new Set(review.records.map((record) => record.eventId))).toEqual(new Set(Object.keys(expected)))
    expect(review.records).toHaveLength(22)

    for (const [eventId, selection] of Object.entries(expected)) {
      const event = events.find((candidate) => candidate.id === eventId)
      expect(event).toBeDefined()
      expect(event?.location).toBe(selection.location)
      expect(event?.image).toBe(selection.paths[0])
      expect(event?.heroImage).toBe(selection.paths[0])
      expect(event?.gallery).toEqual(selection.paths)
      expect(event?.imageAlt).toBe(selection.alts[0])
      expect(event?.heroImageAlt).toBe(selection.alts[0])
      expect(event?.galleryAlts).toEqual(selection.alts)
      expect(event?.gallery).toHaveLength(event?.galleryAlts?.length ?? 0)

      const records = review.records.filter((record) => record.eventId === eventId)
      expect(records.map((record) => record.outputPath)).toEqual(selection.paths)
      expect(records.map((record) => record.location)).toEqual([selection.location, ...Array(records.length - 1).fill(selection.location)])
    }
  })

  it('ships bounded, decodable, metadata-free outputs with matching provenance hashes', async () => {
    const outputPaths = new Set<string>()

    for (const record of review.records) {
      expect(record.sourceFilename).toMatch(/^IMG_[0-9]+(?:_[0-9]+)?\.(?:CR3|JPEG|jpg|jpeg)$/)
      expect(record.captureDate).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      expect(record).not.toHaveProperty('sourceId')
      expect(record).not.toHaveProperty('captureTimestamp')
      expect(record).not.toHaveProperty('captureTimestampTimezone')
      expect(record.sourceSha256).toMatch(/^[a-f0-9]{64}$/)
      expect(record.outputSha256).toMatch(/^[a-f0-9]{64}$/)
      expect(record.mappingBasis).toContain('capture date')
      expect(record.locationSource).toContain('event record')
      expect(record.locationSource).toContain('no embedded GPS')
      expect(record.permissionStatus).toBe('pending-leadership-and-parental-review')
      expect(record.metadataStripped).toBe(true)
      expect(outputPaths.has(record.outputPath)).toBe(false)
      outputPaths.add(record.outputPath)

      const path = diskPath(record.outputPath)
      expect(existsSync(path)).toBe(true)
      const metadata = await sharp(path).metadata()
      expect(metadata.format).toBe('webp')
      expect(metadata.width).toBeLessThanOrEqual(2200)
      expect(metadata.exif).toBeUndefined()
      expect(metadata.xmp).toBeUndefined()
      expect(metadata.icc).toBeUndefined()
      expect(metadata.iptc).toBeUndefined()
      expect(readFileSync(path).byteLength).toBeLessThanOrEqual(600_000)
      expect(hashFile(path)).toBe(record.outputSha256)
    }
  })
})
