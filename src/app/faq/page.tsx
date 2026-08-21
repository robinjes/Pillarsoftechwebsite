import Image from 'next/image'
import Link from 'next/link'
import { ArrowUpRight, ChevronDown, ClipboardList } from 'lucide-react'
import SignalPageIntro from '@/components/site/SignalPageIntro'

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
    <main className="min-h-screen overflow-x-hidden bg-[var(--bone)] text-[var(--carbon)]">
      <SignalPageIntro
        eyebrow="TROUBLESHOOTING LOG / 01"
        title="Find your next clear step."
        description="Browse by audience, open the question that matches your situation, and keep the contact route close if you need a human answer."
        image={{
          src: '/images/events/family-science-night/IMG_6105.jpg',
          alt: 'Students test a hands-on project during Family Science Night.',
        }}
        tone="bone"
        imagePosition="center"
        actions={(
          <Link href="/contact" className="signal-button signal-button--orange">
            Ask a question
            <ArrowUpRight aria-hidden="true" className="h-4 w-4" />
          </Link>
        )}
      />

      <section aria-label="Scenes from Pillars of Tech events" className="border-b border-[var(--carbon)]/25 bg-[var(--carbon)]">
        <div className="signal-shell grid grid-cols-3 gap-1 py-1 sm:gap-3 sm:py-3">
          {photoRibbon.map((photo, index) => (
            <figure key={photo.src} className="relative aspect-[4/3] overflow-hidden border border-[var(--off-white)]/15 bg-[var(--mist)]">
              <Image src={photo.src} alt={photo.alt} fill sizes="(min-width: 1024px) 30vw, 33vw" className="object-cover" />
              <figcaption className="absolute inset-x-0 bottom-0 bg-[var(--carbon)]/80 px-2 py-2 signal-mono text-[var(--off-white)]">ROOM / 0{index + 1}</figcaption>
            </figure>
          ))}
        </div>
      </section>

      <section className="bg-[var(--off-white)]" aria-labelledby="faq-index-title">
        <div className="signal-shell py-16 sm:py-20 lg:py-28">
          <div className="mb-8 flex items-end justify-between gap-5 border-b border-[var(--carbon)]/30 pb-7">
            <div>
              <p className="signal-mono text-[var(--signal-orange)]">INDEX / 02 · COMMON ROUTES</p>
              <h2 id="faq-index-title" className="mt-3 font-display text-4xl font-semibold leading-[0.93] tracking-[-0.05em] text-[var(--carbon)] sm:text-5xl">Questions, made useful.</h2>
            </div>
            <ClipboardList aria-hidden="true" className="hidden h-8 w-8 text-[var(--ultramarine)] sm:block" strokeWidth={1.5} />
          </div>

          <div className="divide-y divide-[var(--carbon)]/25 border-y border-[var(--carbon)]/25">
            {faqSections.map((section, sectionIndex) => (
              <section key={section.title} className="grid gap-8 py-10 lg:grid-cols-[0.42fr_1fr] lg:gap-16 lg:py-14">
                <div>
                  <p className="signal-mono text-[var(--signal-orange)]">0{sectionIndex + 1} / ROUTE</p>
                  <h3 className="mt-4 font-display text-3xl font-semibold leading-[0.94] tracking-[-0.045em] text-[var(--carbon)] sm:text-4xl">{section.title}</h3>
                  <p className="mt-3 max-w-xs font-body text-sm leading-6 text-[var(--carbon)]/65">{section.intro}</p>
                </div>

                <div className="divide-y divide-[var(--carbon)]/25 border-y border-[var(--carbon)]/25">
                  {section.questions.map((faq, faqIndex) => (
                    <details key={faq.question} className="group">
                      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-6 py-5 font-body text-base font-bold text-[var(--carbon)] outline-none transition-colors hover:text-[var(--ultramarine)] focus-visible:ring-2 focus-visible:ring-[var(--signal-orange)] focus-visible:ring-offset-4 [&::-webkit-details-marker]:hidden">
                        <span><span className="signal-mono mr-3 text-[var(--signal-orange)]">{String(faqIndex + 1).padStart(2, '0')}</span>{faq.question}</span>
                        <ChevronDown aria-hidden="true" className="h-5 w-5 flex-none text-[var(--ultramarine)] transition-transform group-open:rotate-180" />
                      </summary>
                      <p className="max-w-3xl pb-6 pr-8 font-body text-base leading-7 text-[var(--carbon)]/70">{faq.answer}</p>
                    </details>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[var(--ultramarine)] text-[var(--off-white)]" aria-labelledby="faq-contact-title">
        <div className="signal-shell grid gap-8 py-14 sm:py-20 lg:grid-cols-[1fr_auto] lg:items-end lg:py-24">
          <div>
            <p className="signal-mono text-[var(--signal-orange)]">OPEN TICKET / 03</p>
            <h2 id="faq-contact-title" className="mt-3 max-w-2xl font-display text-4xl font-semibold leading-[0.93] tracking-[-0.05em] sm:text-5xl">Still curious? Start a conversation.</h2>
          </div>
          <Link href="/contact" className="signal-button signal-button--light">
            Contact the team
            <ArrowUpRight aria-hidden="true" className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </main>
  )
}
