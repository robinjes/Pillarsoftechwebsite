import Image from 'next/image'
import type { ReactNode } from 'react'

type SignalPageIntroProps = {
  eyebrow: string
  title: string
  description: string
  image: { src: string; alt: string }
  actions?: ReactNode
  tone?: 'bone' | 'carbon' | 'blue'
  imagePosition?: string
}

/** A server-rendered route intro shared by the public subpages. */
export default function SignalPageIntro({
  eyebrow,
  title,
  description,
  image,
  actions,
  tone = 'bone',
  imagePosition = 'center',
}: SignalPageIntroProps) {
  return (
    <section className={`signal-page-intro signal-page-intro--${tone}`} aria-labelledby="signal-page-title">
      <div className="signal-shell signal-page-intro__grid">
        <div className="signal-page-intro__copy">
          <p className="signal-mono signal-page-intro__eyebrow">{eyebrow}</p>
          <h1 id="signal-page-title" className="signal-page-intro__title">{title}</h1>
          <p className="signal-page-intro__description">{description}</p>
          {actions ? <div className="signal-page-intro__actions">{actions}</div> : null}
        </div>
        <figure className="signal-page-intro__image">
          <Image src={image.src} alt={image.alt} fill sizes="(max-width: 1024px) 100vw, 48vw" style={{ objectPosition: imagePosition }} />
          <span className="signal-page-intro__mark signal-page-intro__mark--tl" aria-hidden="true" />
          <span className="signal-page-intro__mark signal-page-intro__mark--br" aria-hidden="true" />
          <figcaption className="signal-mono">PILLARS / FIELD RECORD</figcaption>
        </figure>
      </div>
    </section>
  )
}
