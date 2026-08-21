'use client'

import { useEffect, useRef, useState, type ComponentType } from 'react'

const WORKSHOP_HEIGHT_CLASSES = 'min-h-[320vh] max-lg:min-h-[175vh] motion-reduce:min-h-screen'
const DESKTOP_MEDIA_QUERY = '(min-width: 1024px)'

function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      setMatches(false)
      return
    }

    const mediaQuery = window.matchMedia(query)
    const update = () => setMatches(mediaQuery.matches)
    update()
    mediaQuery.addEventListener('change', update)
    return () => mediaQuery.removeEventListener('change', update)
  }, [query])

  return matches
}

export default function WorkshopAssemblyDesktopLoader() {
  const isDesktop = useMediaQuery(DESKTOP_MEDIA_QUERY)
  const [DesktopWorkshopAssembly, setDesktopWorkshopAssembly] = useState<ComponentType | null>(null)
  const placeholderRef = useRef<HTMLElement>(null)
  const requestedRef = useRef(false)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  useEffect(() => {
    if (!isDesktop) return

    const desktopViewportMatches = () => (
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia(DESKTOP_MEDIA_QUERY).matches
    )

    const loadWorkshopAssembly = () => {
      if (requestedRef.current || !desktopViewportMatches()) return
      requestedRef.current = true
      void import('@/components/site/WorkshopAssemblyDesktop').then(({ default: DesktopComponent }) => {
        if (mountedRef.current) setDesktopWorkshopAssembly(() => DesktopComponent)
      })
    }

    const placeholder = placeholderRef.current
    if (!placeholder || typeof IntersectionObserver === 'undefined') {
      loadWorkshopAssembly()
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return
        observer.disconnect()
        loadWorkshopAssembly()
      },
      { rootMargin: '480px 0px' },
    )
    observer.observe(placeholder)

    return () => {
      observer.disconnect()
    }
  }, [isDesktop])

  if (!isDesktop) return null

  return DesktopWorkshopAssembly ? (
    <DesktopWorkshopAssembly />
  ) : (
    <section
      ref={placeholderRef}
      className={`relative bg-midnight text-warm ${WORKSHOP_HEIGHT_CLASSES}`}
      aria-labelledby="workshop-loading-heading"
      aria-busy="true"
    >
      <div className="site-shell mx-auto flex min-h-[calc(100svh-4.75rem)] items-center px-5 py-20 sm:px-8 lg:px-10">
        <div className="max-w-xl">
          <p className="eyebrow text-sky">Interactive rover study</p>
          <h2 id="workshop-loading-heading" className="display-heading mt-4 text-4xl sm:text-5xl">
            Every part has a purpose.
          </h2>
          <p className="mt-6 max-w-md text-base leading-7 text-warm/70">Preparing the scroll-controlled rover study.</p>
        </div>
      </div>
    </section>
  )
}
