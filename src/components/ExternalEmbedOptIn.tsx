'use client'

import { useId, useState } from 'react'

type ExternalEmbedOptInProps = {
  src: string
  title: string
  directLabel: string
  loadLabel: string
  description: string
  fallbackCopy: string
  className?: string
}

/**
 * Keeps third-party content out of the initial page load. The direct link is
 * always available, while the iframe only appears after an explicit choice.
 */
export default function ExternalEmbedOptIn({
  src,
  title,
  directLabel,
  loadLabel,
  description,
  fallbackCopy,
  className = '',
}: ExternalEmbedOptInProps) {
  const [isLoaded, setIsLoaded] = useState(false)
  const id = useId()
  const headingId = `${id}-heading`
  const frameId = `${id}-frame`

  return (
    <section className={className} aria-labelledby={headingId}>
      <div className="flex flex-col gap-5 border-b border-[var(--ink)]/20 px-3 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 id={headingId} className="font-display text-xl text-[var(--midnight)]">Optional embedded view</h2>
          <p className="mt-2 max-w-2xl font-body text-sm leading-6 text-[var(--ink)]/70">{description}</p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-3">
          <a
            href={src}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 items-center justify-center border-2 border-[var(--midnight)] px-4 py-3 font-body text-xs font-bold text-[var(--midnight)] transition hover:bg-[var(--midnight)] hover:text-[var(--cream)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sky)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--cream)]"
          >
            {directLabel}
          </a>
          {!isLoaded && (
            <button
              type="button"
              onClick={() => setIsLoaded(true)}
              aria-controls={frameId}
              aria-expanded={false}
              className="inline-flex min-h-11 items-center justify-center bg-[var(--midnight)] px-4 py-3 font-body text-xs font-bold text-[var(--cream)] transition hover:bg-[var(--cobalt)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sky)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--cream)]"
            >
              {loadLabel}
            </button>
          )}
        </div>
      </div>

      {isLoaded ? (
        <iframe
          id={frameId}
          src={src}
          title={title}
          className="h-[720px] w-full border-0 sm:h-[780px]"
          loading="lazy"
          referrerPolicy="strict-origin-when-cross-origin"
        >
          {fallbackCopy}
        </iframe>
      ) : (
        <p className="px-3 py-8 font-body text-sm leading-6 text-[var(--ink)]/70">
          The external panel stays closed until you choose to load it. {fallbackCopy}
        </p>
      )}

      {isLoaded && (
        <p className="border-t border-[var(--ink)]/20 px-3 py-3 font-body text-xs leading-5 text-[var(--ink)]/60">
          {fallbackCopy}
        </p>
      )}
    </section>
  )
}
