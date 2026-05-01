'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { AnimatePresence, motion } from 'framer-motion'
import { Space_Grotesk } from 'next/font/google'
import { X } from 'lucide-react'
import type { GalleryPhoto } from '@/data/photo-galleries'

const spaceGrotesk = Space_Grotesk({ subsets: ['latin'] })

const CLOUDINARY_CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME

type CloudinaryPhotoGalleryProps = {
  title: string
  description: string
  folder: string
  photos: GalleryPhoto[]
}

const buildCloudinaryUrl = (
  publicId: string,
  transforms: string
) => {
  if (!CLOUDINARY_CLOUD_NAME) return null

  return `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/image/upload/${transforms}/${publicId}`
}

export default function CloudinaryPhotoGallery({
  title,
  description,
  folder,
  photos,
}: CloudinaryPhotoGalleryProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null)

  useEffect(() => {
    if (activeIndex === null) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setActiveIndex(null)
      }
    }

    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKeyDown)

    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [activeIndex])

  const activePhoto = activeIndex !== null ? photos[activeIndex] : null

  return (
    <>
      <main className="min-h-screen bg-primary px-4 pb-20 pt-24 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-br from-white/10 via-white/5 to-transparent p-6 shadow-2xl shadow-black/10 backdrop-blur-xl sm:p-8 lg:p-10">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.18),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(147,197,253,0.16),transparent_30%)]" />

            <div className="relative">
              <p className={`${spaceGrotesk.className} text-sm font-bold uppercase tracking-[0.32em] text-blue-200/80`}>
                Photo Gallery
              </p>
              <h1 className={`${spaceGrotesk.className} mt-4 text-4xl font-black tracking-tight text-white sm:text-5xl`}>
                {title}
              </h1>
              <p className="mt-4 max-w-3xl text-base leading-8 text-blue-100/90 sm:text-lg">
                {description}
              </p>

              <div className="mt-8 rounded-[1.5rem] border border-white/10 bg-slate-950/20 p-4 sm:p-5">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-bold uppercase tracking-[0.24em] text-blue-200/80">
                      Cloudinary Folder
                    </p>
                    <p className={`${spaceGrotesk.className} mt-2 text-base font-bold text-white`}>
                      {folder}
                    </p>
                  </div>
                  <p className="text-sm leading-7 text-blue-100/80">
                    Tap any image to view it fullscreen.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {!CLOUDINARY_CLOUD_NAME ? (
            <section className="mt-8 rounded-[1.75rem] border border-amber-300/20 bg-amber-400/10 p-6 text-amber-50 shadow-xl shadow-black/10 backdrop-blur-xl">
              <h2 className={`${spaceGrotesk.className} text-xl font-black text-white`}>
                Cloudinary Setup Needed
              </h2>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-amber-50/90 sm:text-base">
                Add `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` to load this gallery from Cloudinary. The
                page is already wired to the `wildcat-tank-2026` folder and uses a starter public
                ID list that can later be replaced with dynamic folder loading.
              </p>
            </section>
          ) : null}

          <section className="mt-8">
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {photos.map((photo, index) => {
                const gridImageUrl = buildCloudinaryUrl(
                  photo.publicId,
                  'f_auto,q_auto,c_fill,ar_4:3,w_1200'
                )

                if (!gridImageUrl) {
                  return (
                    <div
                      key={photo.publicId}
                      className="flex min-h-[16rem] items-center justify-center rounded-[1.5rem] border border-dashed border-white/15 bg-slate-950/20 p-6 text-center text-sm leading-7 text-blue-100/75"
                    >
                      {photo.alt}
                    </div>
                  )
                }

                return (
                  <motion.button
                    key={photo.publicId}
                    type="button"
                    initial={{ opacity: 0, y: 18 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35, delay: index * 0.04 }}
                    onClick={() => setActiveIndex(index)}
                    className="group relative overflow-hidden rounded-[1.5rem] border border-white/10 bg-slate-950/20 text-left shadow-lg shadow-black/10 transition-transform duration-300 hover:-translate-y-1 focus:outline-none focus:ring-2 focus:ring-white/50"
                  >
                    <div className="relative aspect-[4/3]">
                      <Image
                        src={gridImageUrl}
                        alt={photo.alt}
                        fill
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 25vw"
                        className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-slate-950/10 to-transparent opacity-80 transition-opacity duration-300 group-hover:opacity-100" />
                    </div>
                  </motion.button>
                )
              })}
            </div>
          </section>
        </div>
      </main>

      <AnimatePresence>
        {activePhoto ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/92 p-4 backdrop-blur-md sm:p-6"
            onClick={() => setActiveIndex(null)}
          >
            <motion.button
              type="button"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              onClick={() => setActiveIndex(null)}
              className="absolute right-4 top-4 z-[90] inline-flex h-12 w-12 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white transition-colors hover:bg-white/20 sm:right-6 sm:top-6"
              aria-label="Close fullscreen image"
            >
              <X className="h-5 w-5" />
            </motion.button>

            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 18 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 18 }}
              transition={{ duration: 0.24 }}
              className="relative w-full max-w-6xl"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="relative overflow-hidden rounded-[1.75rem] border border-white/10 bg-slate-900/70 shadow-2xl shadow-black/30">
                <div className="relative aspect-[16/10] max-h-[85vh] min-h-[18rem]">
                  <Image
                    src={buildCloudinaryUrl(
                      activePhoto.publicId,
                      'f_auto,q_auto,c_limit,w_2200'
                    ) || ''}
                    alt={activePhoto.alt}
                    fill
                    sizes="100vw"
                    className="object-contain"
                    priority
                  />
                </div>
                <div className="border-t border-white/10 px-5 py-4 sm:px-6">
                  <p className="text-sm leading-7 text-blue-100/85 sm:text-base">
                    {activePhoto.alt}
                  </p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  )
}
