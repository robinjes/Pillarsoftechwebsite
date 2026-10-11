import { ArrowUpRight } from 'lucide-react'

const geaWebsite = 'https://www.livermoregea.org/'
const linkClassName = 'font-semibold text-[var(--cobalt)] underline decoration-[var(--cobalt)]/40 underline-offset-4 hover:decoration-[var(--cobalt)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4'

function linkedAcademy(text: string) {
  return text.split(/(Green Engineering Academy(?: \(GEA\))?)/g).map((part, index) => (
    part.startsWith('Green Engineering Academy')
      ? <a key={index} href={geaWebsite} target="_blank" rel="noopener noreferrer" className={linkClassName}>{part}</a>
      : part
  ))
}

export default function AltamontEventStory({ description }: { description: string }) {
  // Keep the stored description authoritative, including admin edits. Present
  // the existing partner acknowledgment separately from the event recap.
  const paragraphs = description.split(/\n\s*\n/).map((text) => text.trim()).filter(Boolean)
  const academyHeading = paragraphs.findIndex((text) => /^What is the GEA\?$/i.test(text))
  const recap = academyHeading < 0 ? paragraphs : paragraphs.slice(0, academyHeading)
  const academy = academyHeading < 0 ? [] : paragraphs.slice(academyHeading + 1)
  const acknowledgments = recap.filter((text) => /^We[’']re grateful/.test(text))
  const story = recap.filter((text) => !acknowledgments.includes(text))

  return (
    <div className="mt-7 max-w-[65ch] text-base leading-8 text-[var(--ink)]/85">
      <div className="space-y-7">
        {story.map((text, index) => (
          <div key={index}>
            {text.startsWith('Students put the robots to the test') ? (
              <h3 className="mb-3 font-display text-2xl leading-tight text-[var(--midnight)]">Hands-on robotics</h3>
            ) : null}
            <p className={index === 0 ? 'text-lg leading-8 text-[var(--midnight)]' : undefined}>{linkedAcademy(text)}</p>
          </div>
        ))}
      </div>

      {acknowledgments.length > 0 || academy.length > 0 ? (
        <section className="mt-10 rounded-2xl border border-[var(--ink)]/20 bg-[var(--paper)] p-6 sm:p-8" aria-labelledby="gea-acknowledgment-heading">
          <h3 id="gea-acknowledgment-heading" className="font-display text-2xl leading-tight text-[var(--midnight)]">With thanks to GEA</h3>
          {acknowledgments.map((text, index) => <p key={index} className="mt-4">{linkedAcademy(text)}</p>)}
          {academy.length > 0 ? (
            <div className="mt-6 border-t border-[var(--ink)]/20 pt-6">
              <h4 className="font-semibold text-[var(--midnight)]">About the Green Engineering Academy</h4>
              {academy.flatMap((text) => text.split(/(?<=\.)\s+(?=The program follows)/)).map((text, index) => <p key={index} className="mt-3">{linkedAcademy(text)}</p>)}
            </div>
          ) : null}
          <a href={geaWebsite} target="_blank" rel="noopener noreferrer" className={`mt-5 inline-flex min-h-11 items-center gap-2 ${linkClassName}`}>
            Visit the GEA website <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
          </a>
        </section>
      ) : null}
    </div>
  )
}
