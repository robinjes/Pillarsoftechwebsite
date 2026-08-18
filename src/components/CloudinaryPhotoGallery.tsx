'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import type { GalleryPhoto } from '@/data/photo-galleries'

const CLOUDINARY_CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME

const LOCAL_PHOTO_PATHS: Record<string, string> = {
  'wildcat-tank-2026/Outdoor1': '/images/events/wildcat-tank/Outdoor1.JPG',
  'wildcat-tank-2026/Outdoor2': '/images/events/wildcat-tank/Outdoor2.JPG',
  'wildcat-tank-2026/Judges+Gatty': '/images/events/wildcat-tank/Judges+Gatty.JPG',
}

type CloudinaryPhotoGalleryProps = {
  title: string
  description: string
  folder: string
  photos: GalleryPhoto[]
}

export const buildCloudinaryUrl = (publicId: string, transforms: string): string | null => {
  if (!CLOUDINARY_CLOUD_NAME) return null
  return 'https://res.cloudinary.com/' + CLOUDINARY_CLOUD_NAME + '/image/upload/' + transforms + '/' + publicId
}

const buildImageUrl = (publicId: string): string | null => {
  return LOCAL_PHOTO_PATHS[publicId] || buildCloudinaryUrl(publicId, 'f_auto,q_auto,c_fill,ar_4:3,w_1200') || null
}

const getFocusableElements = (dialog: HTMLDivElement | null): HTMLElement[] => {
  if (!dialog) return []
  return Array.from(dialog.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], iframe, [tabindex]:not([tabindex="-1"])'))
}

export default function CloudinaryPhotoGallery({ title, description, folder, photos }: CloudinaryPhotoGalleryProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null)
  const activePhoto = activeIndex === null ? null : photos[activeIndex]
  const activeIndexRef = useRef<number | null>(activeIndex)
  const openerRef = useRef<HTMLButtonElement | null>(null)
  const dialogRef = useRef<HTMLDivElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const galleryOpen = activeIndex !== null
  activeIndexRef.current = activeIndex

  useEffect(() => {
    if (!galleryOpen) {
      const opener = openerRef.current
      if (opener) {
        window.requestAnimationFrame(() => opener.focus())
        openerRef.current = null
      }
      return
    }

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const initialFocus = window.requestAnimationFrame(() => closeButtonRef.current?.focus())

    const onKeyDown = (event: KeyboardEvent) => {
      const currentIndex = activeIndexRef.current
      if (currentIndex === null) return

      if (event.key === 'Escape') {
        event.preventDefault()
        setActiveIndex(null)
        return
      }
      if (event.key === 'ArrowLeft') {
        event.preventDefault()
        setActiveIndex((current) => current === null ? null : (current - 1 + photos.length) % photos.length)
        return
      }
      if (event.key === 'ArrowRight') {
        event.preventDefault()
        setActiveIndex((current) => current === null ? null : (current + 1) % photos.length)
        return
      }
      if (event.key !== 'Tab') return

      const focusable = getFocusableElements(dialogRef.current)
      if (focusable.length === 0) {
        event.preventDefault()
        return
      }
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => {
      window.cancelAnimationFrame(initialFocus)
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [galleryOpen, photos.length])

  return (
    <main className="min-h-screen bg-[var(--cream)] px-4 pb-20 pt-24 text-[var(--ink)] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="border-y-2 border-[var(--ink)] bg-[var(--midnight)] px-6 py-10 text-[var(--cream)] sm:px-10 sm:py-14">
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-[var(--sky)]">Photo archive / {folder}</p>
          <h1 className="mt-4 font-display text-5xl leading-none sm:text-7xl">{title}</h1>
          <p className="mt-5 max-w-3xl text-base leading-8 text-[var(--cream)]/80 sm:text-lg">{description}</p>
        </header>

        {!CLOUDINARY_CLOUD_NAME ? (
          <section className="border-b-2 border-[var(--ink)] bg-[var(--sky)] px-6 py-7 text-[var(--midnight)]" role="status">
            <p className="text-xs font-bold uppercase tracking-[0.2em]">Repository preview images</p>
            <p className="mt-3 max-w-2xl text-sm leading-7">This archive is showing the approved repository photographs while the optional Cloudinary delivery is not configured.</p>
          </section>
        ) : null}

        <section className="border-b-2 border-[var(--ink)] py-10" aria-labelledby="photos-heading">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div><p className="text-xs font-bold uppercase tracking-[0.24em] text-[var(--cobalt)]">{photos.length} photographs</p><h2 id="photos-heading" className="mt-2 font-display text-4xl text-[var(--midnight)]">Selected frames</h2></div>
            <p className="text-sm text-[var(--ink)]/65">Select a frame to enlarge it. Use arrow keys in the viewer.</p>
          </div>
          <div className="mt-7 grid grid-cols-1 gap-px border border-[var(--ink)] bg-[var(--ink)] sm:grid-cols-2 lg:grid-cols-3">
            {photos.map((photo, index) => {
              const imageUrl = buildImageUrl(photo.publicId)
              return imageUrl ? (
                <button
                  key={photo.publicId}
                  type="button"
                  onClick={(event) => {
                    openerRef.current = event.currentTarget
                    setActiveIndex(index)
                  }}
                  className="group relative min-h-64 bg-[var(--paper)] text-left focus-visible:z-10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--cobalt)]"
                  aria-label={'Open photo: ' + photo.alt}
                >
                  <div className="relative aspect-[4/3] overflow-hidden"><Image src={imageUrl} alt={photo.alt} fill sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw" className="object-cover transition-transform duration-300 group-hover:scale-[1.03]" /></div>
                  <span className="block border-t border-[var(--ink)] px-4 py-3 text-sm font-semibold leading-6 text-[var(--midnight)]">{photo.alt}</span>
                </button>
              ) : (
                <div key={photo.publicId} className="flex min-h-64 items-center bg-[var(--paper)] p-5 text-sm leading-7 text-[var(--ink)]/75">{photo.alt}</div>
              )
            })}
          </div>
        </section>
      </div>

      {activePhoto && activeIndex !== null ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--midnight)]/95 p-4" role="dialog" aria-modal="true" aria-labelledby="photo-viewer-title" onClick={() => setActiveIndex(null)}>
          <div ref={dialogRef} className="relative w-full max-w-6xl border-2 border-[var(--cream)] bg-[var(--midnight)] p-3 rounded-[10px]" onClick={(event) => event.stopPropagation()}>
            <h2 id="photo-viewer-title" className="sr-only">Photo viewer: {activePhoto.alt}</h2>
            <button ref={closeButtonRef} type="button" onClick={() => setActiveIndex(null)} className="absolute right-4 top-4 z-10 inline-flex min-h-11 min-w-11 items-center justify-center border border-[var(--cream)] bg-[var(--midnight)] text-[var(--cream)] rounded-[10px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--sky)]" aria-label="Close photo viewer"><X className="h-5 w-5" aria-hidden="true" /></button>
            {photos.length > 1 ? <><button type="button" onClick={() => setActiveIndex((activeIndex - 1 + photos.length) % photos.length)} className="absolute left-4 top-1/2 z-10 inline-flex min-h-11 min-w-11 -translate-y-1/2 items-center justify-center border border-[var(--cream)] bg-[var(--midnight)] text-[var(--cream)] rounded-[10px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--sky)]" aria-label="Previous photo"><ChevronLeft className="h-5 w-5" aria-hidden="true" /></button><button type="button" onClick={() => setActiveIndex((activeIndex + 1) % photos.length)} className="absolute right-4 top-1/2 z-10 inline-flex min-h-11 min-w-11 -translate-y-1/2 items-center justify-center border border-[var(--cream)] bg-[var(--midnight)] text-[var(--cream)] rounded-[10px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--sky)]" aria-label="Next photo"><ChevronRight className="h-5 w-5" aria-hidden="true" /></button></> : null}
            <div className="relative aspect-[16/10] max-h-[82vh] w-full"><Image src={buildImageUrl(activePhoto.publicId) || ''} alt={activePhoto.alt} fill sizes="100vw" className="object-contain" priority /></div>
            <p className="border-t border-[var(--cream)]/40 px-3 py-4 text-sm leading-7 text-[var(--cream)]">{activePhoto.alt}</p>
          </div>
        </div>
      ) : null}
    </main>
  )
}
