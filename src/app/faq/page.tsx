import Image from 'next/image'
import Link from 'next/link'
import type { Metadata } from 'next'
import { ArrowUpRight, ChevronDown } from 'lucide-react'

export const metadata: Metadata = {
  title: 'FAQ | Pillars of Tech',
  description: 'Find plain-language answers about events, families, volunteers, safety, registration, and contact.',
}

const faqSections = [
  {
    title: 'For students',
    intro: 'Start with the practical details for joining a session.',
    questions: [
      {
        question: 'What kinds of activities do you run?',
        answer: 'Our event listings cover hands-on STEM activities such as robotics, coding, and engineering challenges. Open an event page for the current activity, location, and registration details.',
      },
      {
        question: 'Do I need to bring my own device?',
        answer: 'Check the individual event listing for materials and equipment notes. If a session benefits from a personal laptop or tablet, the listing should say so; you can also ask through the contact page.',
      },
    ],
  },
  {
    title: 'For families',
    intro: 'Useful context when you are planning a visit or workshop.',
    questions: [
      {
        question: 'What age groups are a good fit?',
        answer: 'Age guidance varies by event. Use the event description when an age range is published, or contact us if the listing does not answer your question.',
      },
      {
        question: 'Where can I find event details?',
        answer: 'Visit the events page to browse upcoming and past programs. Each event page carries the current description, location, schedule, and any registration link or note.',
      },
      {
        question: 'Can I ask about equipment or supplies?',
        answer: 'Yes. The wishlist shows the equipment and supplies we are currently collecting. Use the contact form with the wishlist subject to coordinate a donation or ask about another item.',
      },
    ],
  },
  {
    title: 'For volunteers',
    intro: 'Find a clear first step if you want to help.',
    questions: [
      {
        question: 'Do I need prior technical experience?',
        answer: 'Not every volunteer role requires prior technical experience. The volunteer page explains the available path, and the team can help clarify what a specific event needs.',
      },
      {
        question: 'How do I start a collaboration or workshop request?',
        answer: 'Use the contact page and choose the workshop or partnerships subject. Include the setting, timing, and what you are hoping to make possible so the team has a useful starting point.',
      },
    ],
  },
  {
    title: 'For schools',
    intro: 'A starting point for educators and community hosts.',
    questions: [
      {
        question: 'Can our school ask about hosting a workshop?',
        answer: 'Yes. Use Contact and choose the workshop subject. Include the setting, timing, location, and what you hope to make possible so the team can respond with the details that are confirmed.',
      },
      {
        question: 'What should we include in a school request?',
        answer: 'Share the audience, approximate group size, date range, location, and any accessibility or equipment questions. If a detail is not known yet, say so; we will not assume it.',
      },
    ],
  },
  {
    title: 'Safety and accessibility',
    intro: 'Keep questions and personal information in a safe lane.',
    questions: [
      {
        question: 'What should I avoid putting in a message?',
        answer: 'Please do not send passwords, home addresses, school schedules, medical information, or emergency requests through Contact or live chat. Use local emergency services for an emergency.',
      },
      {
        question: 'How can I ask for accessibility help?',
        answer: 'Contact the team before registering or attending. Event records may not include every access detail, and we will talk through the questions we can answer without inventing information.',
      },
    ],
  },
  {
    title: 'Registration',
    intro: 'Understand what happens when a form is open or closed.',
    questions: [
      {
        question: 'How do I register for an event?',
        answer: 'Open the event page and use its participant registration link when the published form is active. The form explains required fields and sends only the answers needed for that registration record.',
      },
      {
        question: 'What if registration is full, closed, or unavailable?',
        answer: 'The page will keep that state visible instead of accepting a placeholder submission. Contact us if you need help finding another published opportunity.',
      },
    ],
  },
  {
    title: 'Contact',
    intro: 'A human route for details that are not posted yet.',
    questions: [
      {
        question: 'How can I reach the team?',
        answer: 'Use the Contact page and choose the subject that best fits your question. You can also use the visible email fallback when that is easier.',
      },
      {
        question: 'Is live chat always available?',
        answer: 'No. Live chat is available only when the Pacific office-hours schedule and the approved staff queue state both say it is open. When it is closed, leave a message through Contact.',
      },
    ],
  },
] as const

const photoRibbon = [
  {
    src: '/images/events/family-science-night/IMG_6049.jpg',
    alt: 'A mentor and younger participant operate a robot together.',
  },
  {
    src: '/images/events/foil-boat-stockmens/drive-03.webp',
    alt: 'A student volunteer speaks with families at an outdoor foil-boat station.',
  },
  {
    src: '/images/events/wildcat-tank-altamont/drive-03.webp',
    alt: 'The Pillars team gathers in front of the Wildcat Tank presentation screen.',
  },
] as const

export default function FAQPage() {
  return (
    <main className="min-h-screen overflow-x-hidden bg-[var(--cream)] text-[var(--ink)]">
      <header className="border-b border-[var(--ink)]/20">
        <div className="mx-auto grid max-w-7xl gap-8 px-5 py-12 sm:px-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-end lg:px-12 lg:py-16">
          <div>
            <p className="font-body text-sm font-semibold text-[var(--cobalt)]">Questions, made useful</p>
            <h1 className="mt-4 max-w-xl font-display text-5xl leading-[0.98] text-[var(--midnight)] sm:text-[4.35rem]">Find your next clear step.</h1>
          </div>
          <div className="max-w-xl lg:justify-self-end">
            <p className="font-body text-base leading-7 text-[var(--ink)]/70 sm:text-lg">
              Browse by audience, open the question that matches your situation, and keep the contact route close if you need a human answer.
            </p>
            <Link
              href="/contact"
              className="mt-6 inline-flex min-h-11 items-center gap-2 border-b-2 border-[var(--cobalt)] pb-1 font-body font-bold text-[var(--cobalt)] transition hover:border-[var(--midnight)] hover:text-[var(--midnight)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sky)] focus-visible:ring-offset-4 focus-visible:ring-offset-[var(--cream)]"
            >
              Ask a question
              <ArrowUpRight aria-hidden="true" className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </header>

      <section aria-label="Scenes from Pillars of Tech events" className="border-b border-[var(--ink)]/20 bg-[var(--midnight)]">
        <div className="mx-auto grid max-w-7xl grid-cols-3 gap-1 px-1 py-1 sm:gap-2 sm:px-8 sm:py-8 lg:px-12">
          {photoRibbon.map((photo) => (
              <figure key={photo.src} className="relative aspect-[4/3] overflow-hidden rounded-[1.25rem] bg-[var(--ink)]">
              <Image src={photo.src} alt={photo.alt} fill sizes="(min-width: 1024px) 33vw, 33vw" className="object-cover" />
            </figure>
          ))}
        </div>
      </section>

      <section className="bg-[var(--paper)]">
        <div className="mx-auto max-w-7xl px-5 py-14 sm:px-8 lg:px-12 lg:py-20">
          <div className="divide-y divide-[var(--ink)]/20 border-y border-[var(--ink)]/20">
            {faqSections.map((section) => (
              <section key={section.title} className="grid gap-8 py-10 lg:grid-cols-[0.42fr_1fr] lg:gap-16 lg:py-14">
                <div>
                  <h2 className="font-display text-3xl leading-tight text-[var(--midnight)] sm:text-4xl">{section.title}</h2>
                  <p className="mt-3 max-w-xs font-body text-sm leading-6 text-[var(--ink)]/65">{section.intro}</p>
                </div>

                <div className="divide-y divide-[var(--ink)]/20 border-y border-[var(--ink)]/20">
                  {section.questions.map((faq) => (
                    <details key={faq.question} className="group">
                      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-6 py-5 font-body text-base font-bold text-[var(--midnight)] outline-none transition-colors hover:text-[var(--cobalt)] focus-visible:ring-2 focus-visible:ring-[var(--sky)] focus-visible:ring-offset-4 [&::-webkit-details-marker]:hidden">
                        <span>{faq.question}</span>
                        <ChevronDown aria-hidden="true" className="h-5 w-5 flex-none text-[var(--cobalt)] transition-transform group-open:rotate-180" />
                      </summary>
                      <p className="max-w-3xl pb-6 pr-8 font-body text-base leading-7 text-[var(--ink)]/70">{faq.answer}</p>
                    </details>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[var(--midnight)] text-[var(--cream)]">
        <div className="mx-auto flex max-w-7xl flex-col gap-8 px-5 py-14 sm:px-8 lg:flex-row lg:items-end lg:justify-between lg:px-12 lg:py-20">
          <div>
            <p className="font-body text-sm font-semibold text-[var(--sky)]">Still curious?</p>
            <h2 className="mt-3 max-w-2xl font-display text-4xl leading-tight sm:text-5xl">A good question is a good start.</h2>
          </div>
          <Link
            href="/contact"
            className="inline-flex min-h-11 items-center justify-center gap-2 bg-[var(--sky)] px-5 py-3 font-body text-sm font-bold text-[var(--midnight)] transition hover:bg-[var(--cream)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sky)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--midnight)]"
          >
            Contact the team
            <ArrowUpRight aria-hidden="true" className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </main>
  )
}
