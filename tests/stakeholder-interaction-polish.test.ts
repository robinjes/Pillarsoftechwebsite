import { readFileSync } from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

const sourceRoot = path.resolve(process.cwd(), 'src')
const readSource = (relativePath: string) => readFileSync(path.join(sourceRoot, relativePath), 'utf8')

const eventsPage = readSource('app/events/page.tsx')
const eventDetailPage = readSource('app/events/[id]/page.tsx')
const volunteerPage = readSource('app/volunteer/page.tsx')
const team = readSource('components/Team.tsx')
const contactRoute = readSource('app/contact/page.tsx')
const contact = readSource('components/Contact.tsx')

describe('stakeholder interaction polish', () => {
  it('turns the public event archive into caption-free responsive cards', () => {
    expect(eventsPage).toContain('function EventCard({ event }: { event: PublicEvent })')
    expect(eventsPage).toContain('data-event-card={event.id}')
    expect(eventsPage).toContain('rounded-[2rem] border-2')
    expect(eventsPage).toContain('grid gap-6 md:grid-cols-2 xl:grid-cols-3')
    expect(eventsPage).toContain('rounded-full border-2')
    expect(eventsPage).toContain('min-h-11 w-full rounded-full border-2')
    expect(eventsPage).not.toContain('function EventRow')
    expect(eventsPage).not.toContain('function FeaturedProgram')
    expect(eventsPage).not.toContain('<figcaption')
    expect(eventDetailPage).not.toContain('<figcaption')
  })

  it('keeps current status branches and exact event action destinations', () => {
    expect(eventsPage).toContain("event.status === 'upcoming' || event.status === 'ongoing'")
    expect(eventsPage).toContain("event.status === 'completed'")
    expect(eventsPage).toContain("event.status === 'cancelled'")
    expect(eventsPage).toContain('href={`/register/${event.slug || event.id}`}')
    expect(eventsPage).toContain('href={`/volunteer?eventId=${encodeURIComponent(event.slug || event.id)}`}')
    expect(eventsPage).toContain('Read The Story')
    expect(eventsPage).toContain('Participant Registration')
    expect(eventDetailPage).toContain('const registrationHref = `/register/${event.slug || event.id}`')
    expect(eventDetailPage).toContain('const volunteerHref = `/volunteer?eventId=${encodeURIComponent(event.slug || event.id)}`')
    expect(eventDetailPage).toContain('isCurrent && event.registrationLink')
  })

  it('presents team and volunteer applications while preserving identities and workflow calls', () => {
    expect(team).toContain("import { ButtonLink } from '@/components/site/FamilyPrimitives'")
    expect((team.match(/variant="glass"/g) ?? [])).toHaveLength(2)
    expect((team.match(/href={teamJoinUrl}/g) ?? [])).toHaveLength(2)
    expect((team.match(/Join The Team Application/g) ?? [])).toHaveLength(2)
    expect(team).toContain('Volunteer With Us')
    for (const member of [
      ['Robin Jeshua Deepak', 'Founder & President', '/robin.jpg'],
      ['Yashas Jeedi', 'Vice President', '/yashas.jpg'],
      ['Rahul Eapen', 'Vice President', '/rahul.jpg'],
      ['Jaden Jirasevijinda', 'Vice President', '/jaden.jpg'],
      ['Rohan Munagapati', 'Vice President', '/rohan.jpg'],
      ['Michael Nolan McClung', 'Graphics Design Lead', '/nolan.jpg'],
      ['Nikhil Madineni', 'Member', '/nikhil.jpg'],
      ['Arya Rajavelu', 'Member', '/arya.jpg'],
    ]) {
      expect(team).toContain(member[0])
      expect(team).toContain(member[1])
      expect(team).toContain(member[2])
    }
    expect(team).not.toContain('Family Science Night · team moment')
    expect((team.match(/rounded-full border-2 border-\[var\(--cream\)\]/g) ?? []).length).toBeGreaterThanOrEqual(2)
    expect(volunteerPage).toContain("import { ButtonLink } from '@/components/site/FamilyPrimitives'")
    expect(volunteerPage).toContain('<ButtonLink href={teamJoinUrl} external variant="navy">')
    expect(volunteerPage).toContain('Join The Team Application')
    expect((volunteerPage.match(/volunteerService\.(?:signInWithGoogle|registerForEvent|withdrawFromEvent)/g) ?? [])).toHaveLength(3)
    expect(volunteerPage).not.toContain('Family Science Night · volunteer guidance')
  })

  it('tightens the contact header without changing form or chat boundaries', () => {
    expect(contactRoute).not.toContain('pt-16')
    expect(contact).not.toContain('Start a conversation')
    expect(contact).toContain('underline-offset-2')
    expect(contact).not.toContain('Bring the idea, question, or next practical step.')
    expect(contact).toContain("fetch('/api/contact'")
    expect(contact).toContain('id="contact-form"')
    expect(contact).toContain('The chat window is not connected yet; email is the reliable path today.')
    expect(contact).toContain('pillarsoftech@gmail.com')
    expect(contact).toContain('Open Email Form')
    expect(contact).toContain('Send Message')
  })
})
