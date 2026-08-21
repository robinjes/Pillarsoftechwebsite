import { readFileSync } from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

const page = readFileSync(
  path.resolve(process.cwd(), 'src/app/(admin-protected)/admin/events/page.tsx'),
  'utf8',
)

describe('admin event editor contract coverage', () => {
  it('exposes every EventWrite field through labeled controls', () => {
    for (const label of [
      'Start date/time (ISO-backed)',
      'End date/time (ISO-backed)',
      'Date label',
      'Time label',
      'Timezone (IANA)',
      'Participant registration',
      'Volunteer registration',
      'Participant capacity',
      'Volunteer capacity',
      'Registration link',
      'Registration note',
      'PDF resource URL',
      'Primary image URL',
      'Primary image alt text',
      'Hero image URL',
      'Hero image alt text',
      'Gallery image',
      'YouTube/video resource',
      'Outcome',
    ]) {
      expect(page).toContain(label)
    }

    expect(page).toContain("setField('startsAt'")
    expect(page).toContain("setField('endsAt'")
    expect(page).toContain("setField('participantCapacity'")
    expect(page).toContain("setField('volunteerCapacity'")
    expect(page).toContain("setField('resources'")
    expect(page).toContain("setField('media'")
    expect(page).toContain("setDraft((current) => ({ ...current, outcomes: outcomesFromRows(nextRows) }))")
  })

  it('keeps bounded collection actions aligned with the hardened contract', () => {
    expect(page).toContain('Gallery images ({galleryRows.length}/40)')
    expect(page).toContain('galleryRows.length >= 40')
    expect(page).toContain('Add gallery image')
    expect(page).toContain('Remove gallery image')
    expect(page).toContain('YouTube/video resources ({youtubeRows.length}/20)')
    expect(page).toContain('youtubeRows.length >= 20')
    expect(page).toContain('Add YouTube/video resource')
    expect(page).toContain('Remove YouTube/video resource')
    expect(page).toContain('Outcomes ({outcomeRows.length}/30)')
    expect(page).toContain('outcomeRows.length >= 30')
    expect(page).toContain('Add outcome')
    expect(page).toContain('Remove outcome')
    expect(page).toContain('Assign finalized image')
    expect(page).toContain("imageAssignment === 'gallery'")
    expect(page).toContain("updateGalleryRows([...galleryRows, { url: finalUrl, alt: '' }])")
  })

  it('preserves the signed upload and server finalization flow', () => {
    expect(page).toContain("fetch('/api/admin/media/sign'")
    expect(page).toContain("uploadToSignedUrl(signResult.upload.path, signResult.upload.token, file")
    expect(page).toContain("fetch('/api/admin/media/finalize'")
    expect(page).toContain('body: JSON.stringify({ mediaId: signResult.media.id })')
  })
})
