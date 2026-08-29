/* eslint-disable @next/next/no-img-element */

import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { getPublicBranchDocument, listPublicEvents } from '@/lib/content-repository'
import { isSafeLocalPath } from '@/lib/content-contracts'

export const dynamic = 'force-dynamic'

function absoluteUrl(value: string): string {
  if (/^https:\/\//i.test(value)) return value
  return `https://pillarsoftech.org${value.startsWith('/') ? value : `/${value}`}`
}

export async function generateMetadata(): Promise<Metadata> {
  const document = await getPublicBranchDocument('ga')
  if (!document) notFound()
  return {
    title: `${document.name} | Pillars of Tech`,
    description: `${document.name} serves ${document.serviceArea}. See confirmed programs, leaders, and ways to connect.`,
    alternates: { canonical: '/ga' },
    openGraph: {
      title: `${document.name} | Pillars of Tech`,
      description: `${document.name} serves ${document.serviceArea}.`,
      url: '/ga',
    },
  }
}

export default async function GeorgiaBranchPage() {
  const document = await getPublicBranchDocument('ga')
  if (!document) notFound()

  const events = await listPublicEvents('ga')
  const associatedEvents = events.filter((event) => document.associatedEventIds.includes(event.id) || document.associatedEventIds.includes(event.slug))

  return (
    <main className="min-h-screen bg-[var(--cream)] text-[var(--ink)]">
      <section className="bg-[var(--midnight)] px-5 py-16 text-[var(--cream)] sm:px-8 sm:py-24">
        <div className="mx-auto max-w-6xl">
          <p className="text-sm font-semibold text-[var(--sky)]">Pillars of Tech · {document.branch.toUpperCase()} branch</p>
          <h1 className="mt-4 max-w-4xl font-display text-5xl leading-[0.98] tracking-[-0.04em] sm:text-7xl">{document.name}</h1>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-[var(--cream)]/80">Serving {document.serviceArea} with confirmed, hands-on STEM programs.</p>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-5 py-12 sm:px-8 sm:py-16">
        <section className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]" aria-labelledby="ga-programs-heading">
          <div>
            <p className="text-sm font-semibold text-[var(--cobalt)]">Confirmed programs</p>
            <h2 id="ga-programs-heading" className="mt-3 font-display text-4xl leading-tight text-[var(--midnight)]">Learn by making.</h2>
            <div className="mt-7 grid gap-4 sm:grid-cols-2">
              {document.programs.map((program) => (
                <article key={program.name} className="rounded-[2rem] bg-[var(--sky)] p-6">
                  <h3 className="font-display text-2xl text-[var(--midnight)]">{program.name}</h3>
                  {program.description ? <p className="mt-3 text-sm leading-7">{program.description}</p> : null}
                </article>
              ))}
            </div>
          </div>

          <aside className="rounded-[2rem] bg-[var(--paper)] p-6" aria-labelledby="ga-leaders-heading">
            <p className="text-sm font-semibold text-[var(--cobalt)]">People to know</p>
            <h2 id="ga-leaders-heading" className="mt-3 font-display text-3xl text-[var(--midnight)]">Branch leaders</h2>
            <ul className="mt-5 space-y-4">
              {document.leaders.map((leader) => <li key={`${leader.name}-${leader.role}`}><p className="font-semibold text-[var(--midnight)]">{leader.name}</p><p className="text-sm text-[var(--ink)]/75">{leader.role}</p></li>)}
            </ul>
          </aside>
        </section>

        <section className="mt-16" aria-labelledby="ga-photos-heading">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div><p className="text-sm font-semibold text-[var(--cobalt)]">Approved field photos</p><h2 id="ga-photos-heading" className="mt-3 font-display text-4xl text-[var(--midnight)]">A real view of the work.</h2></div>
          </div>
          <div className="mt-7 grid grid-cols-2 gap-4 sm:grid-cols-3">
            {document.photos.map((photo) => (
              <figure key={photo.url} className="overflow-hidden rounded-[1.5rem] border border-[var(--ink)]/20 bg-[var(--paper)]">
                {isSafeLocalPath(photo.url) ? <Image src={photo.url} alt={photo.alt ?? ''} width={960} height={720} className="aspect-[4/3] w-full object-cover" /> : <img src={photo.url} alt={photo.alt ?? ''} className="aspect-[4/3] w-full object-cover" />}
                <figcaption className="p-3 text-sm leading-6 text-[var(--ink)]/75">{photo.alt}</figcaption>
              </figure>
            ))}
          </div>
        </section>

        {associatedEvents.length > 0 ? (
          <section className="mt-16" aria-labelledby="ga-events-heading">
            <p className="text-sm font-semibold text-[var(--cobalt)]">Branch events</p>
            <h2 id="ga-events-heading" className="mt-3 font-display text-4xl text-[var(--midnight)]">Meet us at a program.</h2>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">{associatedEvents.map((event) => <Link key={event.id} href={`/events/${event.slug}`} className="rounded-[1.5rem] border border-[var(--ink)]/25 bg-[var(--paper)] p-5 font-semibold text-[var(--midnight)] hover:bg-[var(--sky)]">{event.title}</Link>)}</div>
          </section>
        ) : null}

        <section className="mt-16 rounded-[2rem] bg-[var(--midnight)] p-7 text-[var(--cream)] sm:p-9" aria-labelledby="ga-contact-heading">
          <p className="text-sm font-semibold text-[var(--sky)]">Connect with this branch</p>
          <h2 id="ga-contact-heading" className="mt-3 font-display text-4xl">Have a question?</h2>
          <div className="mt-6 flex flex-wrap gap-3"><a href={absoluteUrl(document.contactRoute.url)} target={/^https:\/\//i.test(document.contactRoute.url) ? '_blank' : undefined} rel={/^https:\/\//i.test(document.contactRoute.url) ? 'noopener noreferrer' : undefined} className="inline-flex min-h-11 items-center rounded-full bg-[var(--sky)] px-5 py-3 font-bold text-[var(--midnight)]">{document.contactRoute.label}</a><a href={absoluteUrl(document.cta.url)} target={/^https:\/\//i.test(document.cta.url) ? '_blank' : undefined} rel={/^https:\/\//i.test(document.cta.url) ? 'noopener noreferrer' : undefined} className="inline-flex min-h-11 items-center rounded-full border border-[var(--cream)] px-5 py-3 font-bold text-[var(--cream)]">{document.cta.label}</a></div>
        </section>
      </div>
    </main>
  )
}
