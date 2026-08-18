import Link from 'next/link'
import { ArrowUpRight, ChevronDown } from 'lucide-react'

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
        answer: 'Many workshops are designed for middle school and high school students, while some events welcome younger learners or families. The event description is the best guide for each session.',
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
] as const

export default function FAQPage() {
  return (
    <main className="min-h-screen overflow-x-hidden bg-[var(--cream)] pt-16 text-[var(--ink)]">
      <header className="border-b-2 border-[var(--ink)]/20">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 py-20 sm:px-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-end lg:px-12 lg:py-28">
          <div>
            <p className="mb-6 font-body text-xs font-bold uppercase tracking-[0.28em] text-[var(--cobalt)]">FAQ / Field notes</p>
            <h1 className="max-w-4xl font-display text-5xl leading-[0.96] tracking-tight text-[var(--midnight)] sm:text-7xl lg:text-[6.8rem]">
              The useful answers, in one place.
            </h1>
          </div>
          <div className="border-l-4 border-[var(--cobalt)] pl-6">
            <p className="font-body text-lg leading-8 text-[var(--ink)]/75 sm:text-xl">
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

      <section className="bg-[var(--paper)]">
        <div className="mx-auto max-w-7xl px-5 py-16 sm:px-8 lg:px-12 lg:py-24">
          <div className="divide-y-2 divide-[var(--ink)]/20 border-y-2 border-[var(--ink)]/20">
            {faqSections.map((section, sectionIndex) => (
              <section key={section.title} className="grid gap-8 py-10 lg:grid-cols-[0.42fr_1fr] lg:gap-16 lg:py-14">
                <div>
                  <p className="font-body text-xs font-bold uppercase tracking-[0.26em] text-[var(--cobalt)]">0{sectionIndex + 1}</p>
                  <h2 className="mt-3 font-display text-3xl leading-tight text-[var(--midnight)] sm:text-4xl">{section.title}</h2>
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
            <p className="font-body text-xs font-bold uppercase tracking-[0.28em] text-[var(--sky)]">Still curious?</p>
            <h2 className="mt-4 max-w-2xl font-display text-4xl leading-tight sm:text-5xl">A good question is a good start.</h2>
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
