'use client'

import { usePathname } from 'next/navigation'

export default function PublicAtmosphere() {
  const pathname = usePathname()

  if (pathname.startsWith('/admin') || pathname.startsWith('/volunteer/checkin')) {
    return null
  }

  return (
    <div className="public-atmosphere" aria-hidden="true">
      <span className="public-atmosphere__dots" />
      <span className="public-atmosphere__cut public-atmosphere__cut--left" />
      <span className="public-atmosphere__cut public-atmosphere__cut--right" />
    </div>
  )
}
