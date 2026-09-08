import Link from 'next/link'
import type { PropsWithChildren, ReactNode } from 'react'

type ClassNameProps = {
  className?: string
}
export function PageShell({ children, className = '' }: PropsWithChildren<ClassNameProps>) {
  return <div className={`shell ${className}`.trim()}>{children}</div>
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  id,
  className = '',
  light = false,
}: {
  eyebrow?: string
  title: string
  description?: ReactNode
  id?: string
  className?: string
  light?: boolean
}) {
  return (
    <div className={`section-heading${light ? ' section-heading--light' : ''} ${className}`.trim()}>
      {eyebrow ? <p className={`eyebrow${light ? ' eyebrow--light' : ''}`}>{eyebrow}</p> : null}
      <h2 id={id} className="family-heading">{title}</h2>
      {description ? <p>{description}</p> : null}
    </div>
  )
}

export function ButtonLink({
  children,
  href,
  variant = 'navy',
  className = '',
  external = false,
}: PropsWithChildren<{
  href: string
  variant?: 'sun' | 'glass' | 'navy' | 'outline'
  className?: string
  external?: boolean
}>) {
  const classes = `button button--${variant} focus-ring ${className}`.trim()
  if (external) {
    return (
      <a href={href} className={classes} target="_blank" rel="noreferrer">
        {children}
      </a>
    )
  }
  return <Link href={href} className={classes}>{children}</Link>
}

export function StatusPill({ children, className = '' }: PropsWithChildren<ClassNameProps>) {
  return <span className={`status-pill ${className}`.trim()}>{children}</span>
}

export function FriendlyCard({ children, className = '' }: PropsWithChildren<ClassNameProps>) {
  return <article className={`friendly-card ${className}`.trim()}>{children}</article>
}
