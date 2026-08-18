'use client'

import { useEffect, useRef, useState, type ComponentType } from 'react'

export default function WorkshopAssemblyDesktopLoader() {
  const [DesktopWorkshopAssembly, setDesktopWorkshopAssembly] = useState<ComponentType | null>(null)
  const requestedRef = useRef(false)

  useEffect(() => {
    const mediaQuery = window.matchMedia('(min-width: 1024px)')
    let cancelled = false

    const loadDesktopAssembly = () => {
      if (!mediaQuery.matches || requestedRef.current) return
      requestedRef.current = true
      void import('@/components/site/WorkshopAssemblyDesktop').then(({ default: DesktopComponent }) => {
        if (!cancelled) setDesktopWorkshopAssembly(() => DesktopComponent)
      })
    }

    loadDesktopAssembly()
    mediaQuery.addEventListener('change', loadDesktopAssembly)

    return () => {
      cancelled = true
      mediaQuery.removeEventListener('change', loadDesktopAssembly)
    }
  }, [])

  return DesktopWorkshopAssembly ? <DesktopWorkshopAssembly /> : <section className="relative hidden min-h-[280vh] bg-sky lg:block" aria-hidden="true" />
}
