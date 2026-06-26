import Link from 'next/link'
import { Fredoka } from 'next/font/google'
import { Sparkles, Users, Wrench, ChevronDown } from 'lucide-react'

const fredoka = Fredoka({ subsets: ['latin'] })

const faqSections = [
  {
    title: 'General',
    icon: Sparkles,
    summary: 'The quick overview for families, students, and community partners.',
    questions: [
      {
        question: 'How much do your workshops cost?',
        answer:
          'Our programs and events are 100% free! We are a student-run non-profit dedicated to making STEM accessible.'
      }
    ]
  },
  {
    title: 'For Parents',
    icon: Users,
    summary: 'Helpful details for families planning to join a session.',
    questions: [
      {
        question: 'What age groups do you target?',
        answer:
          'We design most workshops for middle school and high school students, but we can adapt sessions for younger learners, family events, and mixed-age groups when needed.'
      },
      {
        question: 'Do students need to bring their own devices?',
        answer:
          'Not usually. We provide the materials and equipment needed for most workshops. If a session benefits from personal laptops or tablets, we will say so clearly in advance.'
      }
    ]
  },
  {
    title: 'For Volunteers',
    icon: Wrench,
    summary: 'What to expect if you want to help run a program.',
    questions: [
      {
        question: 'Do I need prior technical experience to volunteer?',
        answer:
          'No prior experience is required for many volunteer roles. We provide guidance, training, and clear responsibilities so you can help wherever your strengths are most useful.'
      }
    ]
  }
] as const

export default function FAQPage() {
  return (
    <main className="min-h-screen pt-16">
      <section className="relative overflow-hidden border-b border-white/10 bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.16),transparent_24%),linear-gradient(180deg,#091737_0%,#11265e_100%)]">
        <div className="absolute inset-0 bg-[linear-gradient(135deg,transparent_10%,rgba(255,255,255,0.06)_50%,transparent_90%)] opacity-70" />
        <div className="absolute -left-24 top-10 h-72 w-72 rounded-full bg-cyan-400/20 blur-3xl" />
        <div className="absolute -right-28 top-0 h-80 w-80 rounded-full bg-blue-500/20 blur-3xl" />

        <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
          <div className="max-w-3xl">
            <div className="inline-flex min-h-11 items-center gap-2 rounded-full border border-cyan-300/30 bg-cyan-400/10 px-4 py-2 text-sm font-semibold text-cyan-100">
              <Sparkles className="h-4 w-4" />
              Frequently Asked Questions
            </div>

            <h1 className={`${fredoka.className} mt-6 text-4xl font-bold tracking-tight text-white sm:text-6xl`}>
              Quick answers for families, volunteers, and partners.
            </h1>

            <p className="mt-5 max-w-2xl text-base leading-7 text-blue-100 sm:text-xl sm:leading-8">
              Quick answers for the most common questions we get from families, volunteers, and partners.
            </p>

            <p className="mt-4 text-sm leading-6 text-blue-100">
              Use the buttons below to expand each answer. If you still need something clarified, we are
              happy to help through the contact page.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/contact"
                className="inline-flex min-h-11 items-center justify-center rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-900 transition hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/80 focus-visible:ring-offset-2 focus-visible:ring-offset-[#091737]"
              >
                Ask a question
              </Link>
              <Link
                href="/wishlist"
                className="inline-flex min-h-11 items-center justify-center rounded-full border border-white/15 bg-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/80 focus-visible:ring-offset-2 focus-visible:ring-offset-[#091737]"
              >
                View wishlist
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[linear-gradient(180deg,rgba(17,38,94,0.95)_0%,rgba(8,15,36,0.98)_100%)] py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="sr-only">Frequently asked questions</h2>
          <div className="space-y-8">
            {faqSections.map((section, sectionIndex) => {
              const Icon = section.icon

              return (
                <section
                  key={section.title}
                  className="rounded-[2rem] border border-white/10 bg-slate-950/20 p-5 shadow-[0_30px_100px_-40px_rgba(14,165,233,0.45)] sm:p-7"
                  style={{ animationDelay: `${sectionIndex * 100}ms` }}
                >
                  <div className="mb-5 flex items-start gap-3 sm:items-center">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-400/15 text-cyan-200">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className={`${fredoka.className} text-2xl font-bold text-white`}>
                        {section.title}
                      </h3>
                      <p className="mt-1 text-sm text-blue-100">{section.summary}</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {section.questions.map((faq) => (
                      <details key={faq.question} className="group rounded-2xl border border-white/10 bg-white/5">
                        <summary className="flex min-h-[44px] cursor-pointer list-none items-center justify-between gap-4 px-4 py-4 text-left text-base font-semibold text-white outline-none transition hover:bg-white/5 focus-visible:ring-2 focus-visible:ring-cyan-300/80 focus-visible:ring-offset-2 focus-visible:ring-offset-[#091737] sm:px-5">
                          <span>{faq.question}</span>
                          <ChevronDown className="h-5 w-5 flex-none text-cyan-200 transition-transform duration-200 group-open:rotate-180" />
                        </summary>
                        <div className="px-4 pb-4 text-sm leading-7 text-blue-50 sm:px-5">
                          {faq.answer}
                        </div>
                      </details>
                    ))}
                  </div>
                </section>
              )
            })}
          </div>
        </div>
      </section>
    </main>
  )
}
