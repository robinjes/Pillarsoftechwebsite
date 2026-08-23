'use client'

import { useEffect, useRef, useState, type ComponentType } from 'react'

const WORKSHOP_HEIGHT_CLASSES = 'min-h-[320vh] max-lg:min-h-[175vh] motion-reduce:min-h-screen'

export default function WorkshopAssemblyDesktopLoader() {
  const [DesktopWorkshopAssembly, setDesktopWorkshopAssembly] = useState<ComponentType | null>(null)
  const placeholderRef = useRef<HTMLElement>(null)
  const requestedRef = useRef(false)

  useEffect(() => {
    let cancelled = false

    const loadWorkshopAssembly = () => {
      if (requestedRef.current) return
      requestedRef.current = true
      void import('@/components/site/WorkshopAssemblyDesktop').then(({ default: DesktopComponent }) => {
        if (!cancelled) setDesktopWorkshopAssembly(() => DesktopComponent)
      })
    }

    const placeholder = placeholderRef.current
    if (!placeholder || typeof IntersectionObserver === 'undefined') {
      loadWorkshopAssembly()
      return () => {
        cancelled = true
      }
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
      cancelled = true
      observer.disconnect()
    }
  }, [])

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
          <p className="font-display text-sm font-bold uppercase tracking-[0.2em] text-sky">Workshop assembly</p>
          <h2 id="workshop-loading-heading" className="display-heading mt-4 text-4xl sm:text-5xl">
            Every part has a purpose.
          </h2>
          <p className="mt-6 max-w-md text-base leading-7 text-warm/70">Loading the interactive rover reference model.</p>
        </div>
      </div>
    </section>
  )
}
