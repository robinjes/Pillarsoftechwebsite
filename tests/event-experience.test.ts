import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { toYouTubeEmbedUrl } from '@/lib/event-utils'

const sourceRoot = path.resolve(process.cwd(), 'src')
const readSource = (relativePath: string) => readFileSync(path.join(sourceRoot, relativePath), 'utf8')

const eventsPage = readSource('app/events/page.tsx')
const eventDetailPage = readSource('app/events/[id]/page.tsx')
const adminEventsPage = readSource('app/(admin-protected)/admin/events/page.tsx')
const registrationPage = readSource('app/register/[eventId]/page.tsx')
const wildcatPage = readSource('app/wildcat-tank/page.tsx')
const photosPage = readSource('app/photos/wildcat-tank/page.tsx')
const gallery = readSource('components/CloudinaryPhotoGallery.tsx')
const podium = readSource('components/WildcatTankPodium.tsx')

describe('public event experience', () => {
  it('keeps current, completed, and cancelled programs in separate branches', () => {
    expect(eventsPage).toContain("event.status === 'upcoming' || event.status === 'ongoing'")
    expect(eventsPage).toContain("event.status === 'completed'")
    expect(eventsPage).toContain("event.status === 'cancelled'")
    expect(eventsPage).toContain('Completed programs')
    expect(eventsPage).toContain('Cancelled programs')
    expect(eventsPage).toContain('No upcoming dates are posted yet.')
    expect(eventsPage).not.toMatch(/export function (isCurrentEvent|splitEventSections)/)
  })

  it('exposes only public event story fields and stable actions', () => {
    for (const source of [eventsPage, eventDetailPage]) {
      expect(source).not.toMatch(/event\.(stats|participantCapacity|outcomes)/)
      expect(source).not.toContain('capacityRemaining')
      expect(source).not.toContain('internalNotes')
      expect(source).toContain('next/image')
    }
    expect(eventDetailPage).toContain("toYouTubeEmbedUrl(original)")
    expect(eventDetailPage).toContain('const localHeroVideo = localAsset(event?.heroVideo)')
    expect(eventDetailPage).toContain('<source src={localHeroVideo} />')
    expect(eventDetailPage).toContain('sandbox=""')
    expect(eventDetailPage).toContain('isCurrent && event.registrationLink')
    expect(eventDetailPage).toContain('loading="lazy"')
    expect(toYouTubeEmbedUrl('https://www.youtube.com/watch?v=event-test')).toBe('https://www.youtube-nocookie.com/embed/event-test')
    expect(eventDetailPage).toContain('href="/wildcat-tank"')
    expect(eventDetailPage).toContain('href="/photos/wildcat-tank"')
    expect(eventsPage).toContain("resolveEventImageAlt(event, 'image', image)")
    expect(eventDetailPage).toContain("resolveEventImageAlt(event, 'hero', heroImage)")
    expect(eventDetailPage).toContain("resolveEventImageAlt(event, 'gallery', image, index)")
    expect(eventDetailPage).toContain("resolveEventImageAlt(event, 'gallery', galleryActiveImage, activeGalleryIndex)")
  })

  it('keeps registration dynamic, validated, and limited to exact answers', () => {
    expect(registrationPage).toContain("import { useParams } from 'next/navigation'")
    expect(registrationPage).toContain("fetch('/api/registrations/participant'")
    expect(registrationPage).toContain('answers: formData, honeypot')
    expect(registrationPage).toContain('const [honeypot')
    expect(registrationPage).not.toContain('consent:')
    expect(registrationPage).toContain('field.consent')
    expect(registrationPage).toContain('aria-live')
  })

  it('preserves real Wildcat Tank content without generated popup documents', () => {
    expect(wildcatPage).toContain('Kabir Robot Asst')
    expect(wildcatPage).toContain('timestampSeconds')
    expect(wildcatPage).toContain('https://www.youtube.com/watch?v=ZT57W8NaZeU')
    expect(podium).toContain('timestampLabel')
    expect(podium).toContain('target="_blank"')
    expect(podium).toContain('noopener noreferrer')
    for (const source of [podium, wildcatPage]) {
      expect(source).not.toContain('window.open')
      expect(source).not.toContain('innerHTML')
      expect(source).not.toMatch(/backdrop-blur|bg-gradient|linear-gradient|radial-gradient/)
    }
  })

  it('renders the approved repository photo fallback and keeps the route discoverable', () => {
    expect(photosPage).toContain('CloudinaryPhotoGallery')
    expect(gallery).toContain('/images/events/wildcat-tank/Outdoor1.JPG')
    expect(gallery).toContain('/images/events/wildcat-tank/Outdoor2.JPG')
    expect(gallery).toContain('/images/events/wildcat-tank/Judges+Gatty.JPG')
    expect(gallery).toContain("LOCAL_PHOTO_PATHS[publicId] || buildCloudinaryUrl")
    expect(gallery).not.toContain('Repository preview images')
    expect(gallery).toContain('next/image')
    expect(gallery).toContain('alt=""')
    expect(gallery).toContain("aria-label={'Open photo: ' + photo.alt}")
    for (const file of ['Outdoor1.JPG', 'Outdoor2.JPG', 'Judges+Gatty.JPG']) {
      expect(existsSync(path.resolve(process.cwd(), 'public/images/events/wildcat-tank', file))).toBe(true)
    }
  })

  it('makes event and photo viewers real accessible dialogs', () => {
    for (const source of [eventDetailPage, gallery]) {
      expect(source).toContain('aria-modal="true"')
      expect(source).toContain('aria-labelledby')
      expect(source).toContain('requestAnimationFrame')
      expect(source).toContain('document.body.style.overflow')
      expect(source).toMatch(/key !== 'Tab'/)
      expect(source).toContain('focus()')
      expect(source).toContain('shiftKey')
      expect(source).toContain('Escape')
    }
    expect(eventDetailPage).toContain('galleryTriggerRef')
    expect(eventDetailPage).toContain('pdfTriggerRef')
    expect(eventDetailPage).toContain('galleryCloseButtonRef')
    expect(eventDetailPage).toContain('pdfCloseButtonRef')
    expect(gallery).toContain('openerRef')
    expect(gallery).toContain('closeButtonRef')
    expect(gallery).toContain('aria-describedby="photo-viewer-description"')
    expect(gallery).toContain('id="photo-viewer-description"')
  })

  it('keeps event media descriptions editable without requiring descriptions for legacy images', () => {
    expect(adminEventsPage).toContain('Primary image alt text')
    expect(adminEventsPage).toContain('Hero image alt text')
    expect(adminEventsPage).toContain('Gallery image alt text')
    expect(adminEventsPage).toContain('draft.media.galleryAlts?.[index]')
    expect(adminEventsPage).toContain('Leave a field blank when the title fallback is sufficient.')
  })

  it('keeps the redesign within the editorial visual contract', () => {
    const scopedSources = [
      eventsPage,
      eventDetailPage,
      registrationPage,
      wildcatPage,
      gallery,
      podium,
    ]
    for (const source of scopedSources) {
      expect(source).toContain('var(--cream)')
      expect(source).toContain('var(--ink)')
      expect(source).not.toContain('data:image')
      expect(source).not.toContain('inline-animation')
    }
  })
})
