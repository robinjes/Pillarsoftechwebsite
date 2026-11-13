import Link from 'next/link'
import { wildcatWinterDates, wildcatWinterFaq, wildcatWinterRubric, wildcatWinterSections } from '@/data/wildcat-winter'

const headingClass = 'font-display text-2xl leading-tight text-[var(--midnight)] sm:text-3xl'

function DetailTable({ headings, rows }: { headings: [string, string]; rows: string[][] }) {
  return (
    <div className="mt-5 overflow-x-auto rounded-xl border border-[var(--ink)]/30">
      <table className="w-full text-left text-sm leading-6 sm:text-base">
        <thead className="bg-[var(--sky)] text-[var(--midnight)]"><tr>{headings.map((heading) => <th key={heading} scope="col" className="px-4 py-3 font-bold">{heading}</th>)}</tr></thead>
        <tbody>{rows.map(([label, detail]) => <tr key={label} className="border-t border-[var(--ink)]/20"><th scope="row" className="w-2/5 px-4 py-3 align-top font-semibold">{label}</th><td className="px-4 py-3 align-top">{detail}</td></tr>)}</tbody>
      </table>
    </div>
  )
}

export default function WildcatWinterDetails() {
  return (
    <div className="mt-7 space-y-10 text-base leading-8 text-[var(--ink)]/85">
      {wildcatWinterSections.slice(0, 2).map((section) => <section key={section.title} aria-label={section.title}>
        <h3 className={headingClass}>{section.title}</h3>
        {section.paragraphs.map((paragraph) => <p key={paragraph} className="mt-4">{paragraph}</p>)}
        {section.title === 'What is Wildcat Tank?' ? <Link href="/wildcat-tank" className="mt-4 inline-flex min-h-11 items-center font-semibold text-[var(--cobalt)] underline underline-offset-4">See last spring’s pitches and scores</Link> : null}
      </section>)}
      <section aria-labelledby="winter-key-dates"><h3 id="winter-key-dates" className={headingClass}>Key dates · 2026</h3><DetailTable headings={['Date', 'What happens']} rows={wildcatWinterDates} /></section>
      <section aria-labelledby="winter-judging"><h3 id="winter-judging" className={headingClass}>Judging rubric</h3>
        <p className="mt-4">Each judge scores your pitch from <strong>1–10 in five categories</strong>, for a total of <strong>50 points per judge</strong>.</p>
        <DetailTable headings={['Category', 'What judges look for']} rows={wildcatWinterRubric} />
        <p className="mt-4">There are two presentation rooms. The <strong>top two from each room</strong> return for a short final round in front of all judges. That round decides 1st, 2nd, and 3rd place.</p>
      </section>
      {wildcatWinterSections.slice(2).map((section) => <section key={section.title} aria-label={section.title}>
        <h3 className={headingClass}>{section.title}</h3>
        {section.paragraphs.map((paragraph) => <p key={paragraph} className="mt-4">{paragraph}</p>)}
        {section.items ? <ul className="mt-4 list-disc space-y-3 pl-6">{section.items.map((item) => <li key={item}>{item}</li>)}</ul> : null}
      </section>)}
      <section aria-labelledby="winter-faq"><h3 id="winter-faq" className={headingClass}>Parent FAQ</h3>
        <dl className="mt-5 space-y-6">{wildcatWinterFaq.map(([question, answer]) => <div key={question}><dt className="font-bold text-[var(--midnight)]">{question}</dt><dd className="mt-1">{answer}</dd></div>)}</dl>
        <p className="mt-6">Questions? <a href="mailto:pillarsoftech@gmail.com" className="font-semibold text-[var(--cobalt)] underline underline-offset-4">pillarsoftech@gmail.com</a></p>
        <a href="https://www.instagram.com/thepillarsoftech/" target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center text-[var(--cobalt)] underline underline-offset-4">Instagram: @thepillarsoftech</a>
      </section>
    </div>
  )
}
