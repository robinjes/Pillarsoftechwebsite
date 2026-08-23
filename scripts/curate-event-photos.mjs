#!/usr/bin/env node

import { createHash } from 'node:crypto'
import { mkdir, readdir, readFile, stat, writeFile } from 'node:fs/promises'
import { basename, extname, join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import sharp from 'sharp'

const REPORT_VERSION = 1
const NEAR_DUPLICATE_DISTANCE = 4
const SHEET_COLUMNS = 5
const SHEET_ROWS = 5
const SHEET_PAGE_SIZE = SHEET_COLUMNS * SHEET_ROWS
const CELL_WIDTH = 240
const CELL_HEIGHT = 230
const IMAGE_WIDTH = 220
const IMAGE_HEIGHT = 176
const SHEET_WIDTH = SHEET_COLUMNS * CELL_WIDTH
const SHEET_HEIGHT = SHEET_ROWS * CELL_HEIGHT
const SHEET_BACKGROUND = '#fffdf8'

export function naturalCompare(left, right) {
  const leftStem = left.replace(/\.[^.]+$/, '')
  const rightStem = right.replace(/\.[^.]+$/, '')
  const leftTokens = leftStem.toLowerCase().match(/\d+|\D+/g) ?? []
  const rightTokens = rightStem.toLowerCase().match(/\d+|\D+/g) ?? []
  const length = Math.min(leftTokens.length, rightTokens.length)

  for (let index = 0; index < length; index += 1) {
    const leftToken = leftTokens[index]
    const rightToken = rightTokens[index]
    const leftIsNumber = /^\d+$/.test(leftToken)
    const rightIsNumber = /^\d+$/.test(rightToken)

    if (leftIsNumber && rightIsNumber) {
      const leftNumber = leftToken.replace(/^0+/, '') || '0'
      const rightNumber = rightToken.replace(/^0+/, '') || '0'
      if (leftNumber.length !== rightNumber.length) return leftNumber.length - rightNumber.length
      if (leftNumber !== rightNumber) return leftNumber < rightNumber ? -1 : 1
      if (leftToken.length !== rightToken.length) return leftToken.length - rightToken.length
    } else if (leftToken !== rightToken) {
      return leftToken < rightToken ? -1 : 1
    }
  }

  if (leftTokens.length !== rightTokens.length) return leftTokens.length - rightTokens.length
  if (left === right) return 0
  return left < right ? -1 : 1
}

export function hammingDistance(leftHex, rightHex) {
  let value = BigInt(`0x${leftHex}`) ^ BigInt(`0x${rightHex}`)
  let distance = 0
  while (value > 0n) {
    value &= value - 1n
    distance += 1
  }
  return distance
}

export async function dHashFromBuffer(source) {
  const pixels = await sharp(source, { failOn: 'error' })
    .greyscale()
    .resize(9, 8, { fit: 'fill', kernel: sharp.kernel.nearest })
    .raw()
    .toBuffer()

  let hash = 0n
  for (let row = 0; row < 8; row += 1) {
    for (let column = 0; column < 8; column += 1) {
      const left = pixels[row * 9 + column]
      const right = pixels[row * 9 + column + 1]
      hash = (hash << 1n) | BigInt(left > right ? 1 : 0)
    }
  }

  return hash.toString(16).padStart(16, '0')
}

function parseArgs(argv) {
  const positional = []
  const values = { inputDir: null, outputDir: null, eventLabel: null }
  const flags = new Map([
    ['--input', 'inputDir'],
    ['--input-dir', 'inputDir'],
    ['--output', 'outputDir'],
    ['--output-dir', 'outputDir'],
    ['--event', 'eventLabel'],
    ['--event-label', 'eventLabel'],
  ])

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index]
    if (argument === '--help' || argument === '-h') return { help: true }

    const equalsIndex = argument.indexOf('=')
    const flag = equalsIndex === -1 ? argument : argument.slice(0, equalsIndex)
    const key = flags.get(flag)
    if (key) {
      const value = equalsIndex === -1 ? argv[++index] : argument.slice(equalsIndex + 1)
      if (!value || value.startsWith('--')) throw new Error(`Missing value for ${flag}.`)
      values[key] = value
    } else if (argument.startsWith('-')) {
      throw new Error(`Unknown option: ${argument}`)
    } else {
      positional.push(argument)
    }
  }

  const positionalKeys = ['inputDir', 'outputDir', 'eventLabel']
  for (const key of positionalKeys) {
    if (values[key] === null && positional.length > 0) values[key] = positional.shift()
  }
  if (positional.length > 0) throw new Error('Expected input directory, output directory, and event label only.')
  if (!values.inputDir || !values.outputDir || !values.eventLabel.trim()) {
    throw new Error('Usage: node scripts/curate-event-photos.mjs --input <dir> --output <dir> --event <label>')
  }
  return values
}

function safeOutputLabel(value) {
  const label = value.trim().replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '').toLowerCase()
  return label || 'event'
}

function escapeXml(value) {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&apos;')
}

function shortFilename(filename, maxLength = 30) {
  if (filename.length <= maxLength) return filename
  const extension = extname(filename)
  const stem = basename(filename, extension)
  const available = Math.max(4, maxLength - extension.length - 3)
  return `${stem.slice(0, available)}...${extension}`
}

function labelSvg({ cellNumber, filename, width, height }) {
  const label = `${cellNumber}. ${shortFilename(filename)}`
  const dimensions = `${width} x ${height}`
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${CELL_WIDTH}" height="${CELL_HEIGHT - IMAGE_HEIGHT - 10}" viewBox="0 0 ${CELL_WIDTH} ${CELL_HEIGHT - IMAGE_HEIGHT - 10}">
  <rect width="${CELL_WIDTH}" height="${CELL_HEIGHT - IMAGE_HEIGHT - 10}" fill="${SHEET_BACKGROUND}"/>
  <text x="10" y="17" font-family="Arial, sans-serif" font-size="13" font-weight="700" fill="#0B1F3A">${escapeXml(label)}</text>
  <text x="10" y="34" font-family="Arial, sans-serif" font-size="11" fill="#2B5DA8">${escapeXml(dimensions)}</text>
</svg>`)
}

async function readJpegRecords(inputPath) {
  const entries = await readdir(inputPath, { withFileTypes: true })
  const filenames = entries
    .filter((entry) => entry.isFile() && !entry.name.startsWith('.') && /\.jpe?g$/i.test(entry.name))
    .map((entry) => entry.name)
    .sort(naturalCompare)

  if (filenames.length === 0) throw new Error('No JPEG previews found in input directory.')

  const records = []
  for (const filename of filenames) {
    const sourcePath = join(inputPath, filename)
    let source
    try {
      source = await readFile(sourcePath)
      const metadata = await sharp(source, { failOn: 'error' }).metadata()
      if (metadata.format !== 'jpeg' || !metadata.width || !metadata.height) throw new Error('file is not a readable JPEG')
      const dHash = await dHashFromBuffer(source)
      records.push({
        filename,
        source,
        sourcePath,
        width: metadata.width,
        height: metadata.height,
        sha256: createHash('sha256').update(source).digest('hex'),
        dHash,
      })
    } catch (error) {
      const detail = error instanceof Error ? `: ${error.message}` : ''
      throw new Error(`Unable to decode JPEG preview "${filename}"${detail}`)
    }
  }
  return records
}

function exactDuplicateGroups(records) {
  const buckets = new Map()
  for (const record of records) {
    const bucket = buckets.get(record.sha256) ?? []
    bucket.push(record)
    buckets.set(record.sha256, bucket)
  }

  return [...buckets.entries()]
    .filter(([, bucket]) => bucket.length > 1)
    .map(([sha256, bucket], index) => ({
      id: `exact-${String(index + 1).padStart(3, '0')}`,
      sha256,
      filenames: bucket.map((record) => record.filename),
    }))
}

function nearDuplicateGroups(records) {
  const exactBuckets = new Map()
  for (const record of records) {
    const bucket = exactBuckets.get(record.sha256) ?? { representative: record, records: [] }
    bucket.records.push(record)
    exactBuckets.set(record.sha256, bucket)
  }

  const units = [...exactBuckets.values()].sort((left, right) => naturalCompare(left.representative.filename, right.representative.filename))
  const clusters = []

  for (const unit of units) {
    const candidates = []
    for (let clusterIndex = 0; clusterIndex < clusters.length; clusterIndex += 1) {
      const cluster = clusters[clusterIndex]
      const distances = cluster.map((member) => hammingDistance(unit.representative.dHash, member.representative.dHash))
      if (distances.every((distance) => distance <= NEAR_DUPLICATE_DISTANCE)) {
        candidates.push({ clusterIndex, score: Math.max(...distances) })
      }
    }

    if (candidates.length === 0) {
      clusters.push([unit])
    } else {
      candidates.sort((left, right) => left.score - right.score || left.clusterIndex - right.clusterIndex)
      clusters[candidates[0].clusterIndex].push(unit)
    }
  }

  return clusters
    .filter((cluster) => cluster.length > 1)
    .map((cluster, index) => {
      const pairs = []
      let maxHammingDistance = 0
      for (let leftIndex = 0; leftIndex < cluster.length; leftIndex += 1) {
        for (let rightIndex = leftIndex + 1; rightIndex < cluster.length; rightIndex += 1) {
          const left = cluster[leftIndex].representative
          const right = cluster[rightIndex].representative
          const distance = hammingDistance(left.dHash, right.dHash)
          maxHammingDistance = Math.max(maxHammingDistance, distance)
          pairs.push({ filenames: [left.filename, right.filename], hammingDistance: distance })
        }
      }
      return {
        id: `near-${String(index + 1).padStart(3, '0')}`,
        maxHammingDistance,
        filenames: cluster.flatMap((unit) => unit.records.map((record) => record.filename)).sort(naturalCompare),
        pairs,
      }
    })
}

async function writeContactSheets(records, outputPath, filePrefix) {
  const pages = []
  for (let offset = 0; offset < records.length; offset += SHEET_PAGE_SIZE) {
    const pageRecords = records.slice(offset, offset + SHEET_PAGE_SIZE)
    const pageNumber = pages.length + 1
    const filename = `${filePrefix}-contact-sheet-${String(pageNumber).padStart(3, '0')}.png`
    const composites = []

    for (const [pageIndex, record] of pageRecords.entries()) {
      const column = pageIndex % SHEET_COLUMNS
      const row = Math.floor(pageIndex / SHEET_COLUMNS)
      const left = column * CELL_WIDTH + 10
      const top = row * CELL_HEIGHT + 10
      const image = await sharp(record.source, { failOn: 'error' })
        .resize(IMAGE_WIDTH, IMAGE_HEIGHT, { fit: 'contain', background: SHEET_BACKGROUND })
        .png({ compressionLevel: 9, adaptiveFiltering: false })
        .toBuffer()
      composites.push({ input: image, left, top })
      composites.push({
        input: labelSvg({ cellNumber: offset + pageIndex + 1, filename: record.filename, width: record.width, height: record.height }),
        left: column * CELL_WIDTH,
        top: row * CELL_HEIGHT + IMAGE_HEIGHT + 10,
      })
    }

    await sharp({
      create: {
        width: SHEET_WIDTH,
        height: SHEET_HEIGHT,
        channels: 4,
        background: SHEET_BACKGROUND,
      },
    })
      .composite(composites)
      .png({ compressionLevel: 9, adaptiveFiltering: false })
      .toFile(join(outputPath, filename))

    pages.push({ page: pageNumber, filename, imageCount: pageRecords.length })
  }
  return pages
}

function publicImageRecord(record, index) {
  return {
    index: index + 1,
    filename: record.filename,
    width: record.width,
    height: record.height,
    sha256: record.sha256,
    dHash: record.dHash,
  }
}

export async function curateEventPhotos({ inputDir, outputDir, eventLabel }) {
  if (typeof inputDir !== 'string' || typeof outputDir !== 'string' || typeof eventLabel !== 'string' || !eventLabel.trim()) {
    throw new Error('Input directory, output directory, and event label are required.')
  }

  const inputPath = resolve(inputDir)
  const outputPath = resolve(outputDir)
  let inputStats
  try {
    inputStats = await stat(inputPath)
  } catch {
    throw new Error(`Input directory not found: ${inputDir}`)
  }
  if (!inputStats.isDirectory()) throw new Error(`Input path is not a directory: ${inputDir}`)

  const records = await readJpegRecords(inputPath)
  await mkdir(outputPath, { recursive: true })
  const filePrefix = safeOutputLabel(eventLabel)
  const contactSheets = await writeContactSheets(records, outputPath, filePrefix)
  const report = {
    version: REPORT_VERSION,
    eventLabel: eventLabel.trim(),
    imageCount: records.length,
    images: records.map(publicImageRecord),
    exactDuplicateGroups: exactDuplicateGroups(records),
    nearDuplicateGroups: nearDuplicateGroups(records),
    contactSheets: {
      columns: SHEET_COLUMNS,
      rows: SHEET_ROWS,
      pageSize: SHEET_PAGE_SIZE,
      pages: contactSheets,
    },
  }
  const reportFilename = `${filePrefix}-photo-triage.json`
  const reportPath = join(outputPath, reportFilename)
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8')
  return { report, reportPath, contactSheetPaths: contactSheets.map((page) => join(outputPath, page.filename)) }
}

function usage() {
  return [
    'Usage:',
    '  node scripts/curate-event-photos.mjs --input <jpeg-dir> --output <output-dir> --event <label>',
    '',
    'Positional form is also accepted: <jpeg-dir> <output-dir> <label>.',
  ].join('\n')
}

export async function main(argv = process.argv.slice(2)) {
  try {
    const options = parseArgs(argv)
    if (options.help) {
      console.log(usage())
      return 0
    }
    const result = await curateEventPhotos(options)
    console.log(`Curated ${result.report.imageCount} JPEG preview(s) into ${result.reportPath}`)
    console.log(`Wrote ${result.contactSheetPaths.length} contact sheet page(s).`)
    return 0
  } catch (error) {
    console.error(`Photo triage failed: ${error instanceof Error ? error.message : String(error)}`)
    console.error(usage())
    return 1
  }
}

const invokedPath = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : ''
if (import.meta.url === invokedPath) {
  const exitCode = await main()
  if (exitCode !== 0) process.exitCode = exitCode
}
