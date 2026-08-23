#!/usr/bin/env node

/**
 * Reviewable, offline staging importer for the checked-in event snapshot.
 *
 * Usage (after a human reviews the generated SQL):
 *   node scripts/import-content.mjs > /tmp/pot-content-review.sql
 *   psql "<STAGING_DATABASE_URL>" --file /tmp/pot-content-review.sql
 *
 * The script never connects to a database, reads environment files, imports
 * forms/destinations, or seeds impact/finance/outcome claims. Every event is
 * staged unpublished so a content owner must review and publish it.
 */

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const snapshotPath = resolve(process.cwd(), 'src/data/events.json')
const events = JSON.parse(readFileSync(snapshotPath, 'utf8'))

const approvedHosts = new Set([
  'pillarsoftech.org', 'www.pillarsoftech.org', 'pillarsoftech.com', 'www.pillarsoftech.com',
  'hcb.hackclub.com', 'forms.gle', 'docs.google.com', 'sites.google.com',
  'youtube.com', 'www.youtube.com', 'youtu.be', 'www.youtu.be',
])

function sql(value) {
  return `'${String(value ?? '').replaceAll("'", "''")}'`
}

function safeUrl(value) {
  if (typeof value !== 'string' || !value.trim()) return null
  const trimmed = value.trim()
  if (trimmed.startsWith('/') && !trimmed.startsWith('//') && isSafeLocalPath(trimmed)) return trimmed
  try {
    const parsed = new URL(trimmed)
    if (parsed.protocol !== 'https:' || parsed.username || parsed.password || !approvedHosts.has(parsed.hostname.toLowerCase())) return null
    return trimmed
  } catch {
    return null
  }
}

function isSafeLocalPath(value) {
  return (
    value.startsWith('/') &&
    !value.startsWith('//') &&
    !value.includes('\\') &&
    !value.split('/').includes('..') &&
    !/%2e/i.test(value) &&
    !/[\u0000-\u001f\u007f]/.test(value)
  )
}

function safeList(value) {
  if (!Array.isArray(value)) return []
  return value.map(safeUrl).filter(Boolean)
}

function json(value) {
  return sql(JSON.stringify(value)) + '::jsonb'
}

function status(value) {
  if (value === 'past') return 'completed'
  return ['upcoming', 'ongoing', 'completed', 'cancelled'].includes(value) ? value : 'draft'
}

function dateLabel(value) {
  return typeof value === 'string' ? value.trim() : ''
}

if (!Array.isArray(events)) throw new Error('Expected src/data/events.json to contain an array.')

console.log('-- Generated from the reviewed checked-in event snapshot.')
console.log('-- Review every row and publish only after leadership/content approval.')
console.log('begin;')
for (const event of events) {
  const id = typeof event.id === 'string' ? event.id.trim() : ''
  const title = typeof event.title === 'string' ? event.title.trim() : ''
  if (!/^[a-z0-9][a-z0-9_-]{0,63}$/.test(id) || !title) continue
  const image = safeUrl(event.image)
  const heroImage = safeUrl(event.heroImage)
  const heroVideo = safeUrl(event.heroVideo)
  const gallery = safeList(event.gallery)
  const youtubeVideos = safeList(event.youtubeVideos)
  const media = { ...(image ? { image } : {}), ...(heroImage ? { heroImage } : {}), ...(heroVideo ? { heroVideo } : {}), ...(gallery.length ? { gallery } : {}), ...(youtubeVideos.length ? { youtubeVideos } : {}) }
  const resources = {}
  const startLabel = dateLabel(event.date)
  const endLabel = dateLabel(event.time)
  console.log(`insert into public.events (id, slug, title, summary, description, timezone, start_label, end_label, location, program_category, status, media, resources, participant_registration_state, volunteer_registration_state, outcomes, publication_state) values (${sql(id)}, ${sql(id)}, ${sql(title)}, ${sql(String(event.description ?? '').split(/\n\n/)[0].slice(0, 1000))}, ${sql(String(event.description ?? '').slice(0, 12000))}, 'America/New_York', ${sql(startLabel)}, ${sql(endLabel)}, ${sql(event.location)}, 'general', ${sql(status(event.status))}, ${json(media)}, ${json(resources)}, 'closed', 'closed', '{}'::jsonb, 'unpublished') on conflict (id) do update set title = excluded.title, summary = excluded.summary, description = excluded.description, start_label = excluded.start_label, end_label = excluded.end_label, location = excluded.location, status = excluded.status, media = excluded.media, resources = excluded.resources, outcomes = '{}'::jsonb, publication_state = 'unpublished', updated_at = timezone('utc', now());`)
}
console.log('commit;')
