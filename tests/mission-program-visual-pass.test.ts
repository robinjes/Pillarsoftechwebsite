import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const read = (relativePath: string) => readFileSync(join(process.cwd(), relativePath), 'utf8')

describe('mission and program visual pass', () => {
  it('opens About with an asymmetric, real-photo workshop triptych', () => {
    const about = read('src/components/About.tsx')

    expect(about).toContain("import Image from 'next/image'")
    for (const photo of [
      '/images/events/altamont-creek-open-house/cover.png',
      '/images/events/wildcat-tank-altamont/drive-01.webp',
      '/images/events/pedrozzi-connect-egg-drop/drive-01.webp',
    ]) {
      expect(about).toContain(photo)
    }
    expect(about).toContain('Altamont Creek Open House · test the idea')
    expect(about).toContain('Wildcat Tank · present the idea')
    expect(about).toContain('Pedrozzi CONNECT · learn and build together')
    expect(about).toContain('Our mission')
    expect(about).not.toContain('border-l-4')
    expect(about).not.toMatch(/uppercase tracking/)
  })

  it('uses a portrait mosaic and factual group/work evidence on Team', () => {
    const team = read('src/components/Team.tsx')

    for (const portrait of ['/robin.jpg', '/yashas.jpg', '/rahul.jpg', '/jaden.jpg', '/rohan.jpg', '/nolan.jpg', '/nikhil.jpg', '/arya.jpg']) {
      expect(team).toContain(`image: '${portrait}'`)
    }
    expect(team).toContain('/images/events/family-science-night/IMG_0551.jpg')
    expect(team).toContain('Pillars volunteers and adult partners smiling together outside Family Science Night.')
    expect(team).toContain('Family Science Night · team moment')
    expect(team).toContain('portraitLayouts')
    expect(team).not.toContain('border-l-4')
    expect(team).not.toMatch(/uppercase tracking/)
  })

  it('keeps Events search and filters while adding a labeled featured composition', () => {
    const events = read('src/app/events/page.tsx')

    expect(events).toContain("fetch('/api/events')")
    expect(events).toContain('FeaturedProgram')
    expect(events).toContain('From a recent Pillars workshop')
    expect(events).toContain('Search programs and events')
    expect(events).toContain("filter === 'completed'")
    expect(events).toContain("filter === 'cancelled'")
    expect(events).toContain('Completed programs')
    expect(events).toContain("/images/events/family-science-night/IMG_8332.JPG")
    expect(events).toContain('A Pillars of Tech volunteer and participant operate a VEX robot during Family Science Night.')
    expect(events).not.toContain('pt-24')
    expect(events).not.toMatch(/uppercase tracking/)
  })

  it('strengthens event detail photography without dropping interactions or contracts', () => {
    const detail = read('src/app/events/[id]/page.tsx')

    expect(detail).toContain('archiveHeroFallback')
    expect(detail).toContain('/images/events/family-science-night/IMG_8332.JPG')
    expect(detail).toContain('A Pillars of Tech volunteer and participant operate a VEX robot during Family Science Night.')
    expect(detail).toContain('From a recent Pillars workshop')
    expect(detail).toContain('galleryTriggerRef')
    expect(detail).toContain('pdfTriggerRef')
    expect(detail).toContain('Register as a participant')
    expect(detail).toContain('Volunteer at this event')
    expect(detail).toContain('toYouTubeEmbedUrl(original)')
    expect(detail).toContain('What participants practiced')
    expect(detail).not.toContain('event.outcomes')
    expect(detail).not.toContain('pt-24')
    expect(detail).not.toMatch(/uppercase tracking/)
  })
})
