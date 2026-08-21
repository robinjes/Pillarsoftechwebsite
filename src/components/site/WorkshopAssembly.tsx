import Image from 'next/image'

import DesktopWorkshopAssemblyLoader from '@/components/site/WorkshopAssemblyDesktopLoader'
import { stages } from '@/components/site/workshopAssemblyData'

export default function WorkshopAssembly() {
  return (
    <>
      <DesktopWorkshopAssemblyLoader />
      <section
        className="relative bg-midnight text-warm lg:hidden"
        data-workshop-static="narrow"
        aria-labelledby="workshop-static-heading"
      >
        <div className="workshop-registration-layer pointer-events-none absolute inset-4 z-10 sm:inset-6" aria-hidden="true">
          <span className="workshop-registration-mark workshop-registration-mark--top-left" />
          <span className="workshop-registration-mark workshop-registration-mark--top-right" />
          <span className="workshop-registration-mark workshop-registration-mark--bottom-left" />
          <span className="workshop-registration-mark workshop-registration-mark--bottom-right" />
          <span className="workshop-cut-mark workshop-cut-mark--left" />
          <span className="workshop-cut-mark workshop-cut-mark--right" />
        </div>

        <div className="site-shell relative z-10 mx-auto px-5 py-20 sm:px-8 lg:px-10">
          <div className="max-w-xl">
            <p className="font-display text-xs font-bold uppercase tracking-[0.2em] text-sky">Workshop assembly</p>
            <h2 id="workshop-static-heading" className="display-heading mt-4 max-w-md text-4xl text-warm sm:text-5xl">
              Every part has a purpose.
            </h2>
            <p className="mt-5 max-w-md text-base leading-7 text-warm/75">
              A student demonstrates a VEX robot at Family Science Night. The work behind every build follows a simple
              sequence: each choice gives the next question somewhere to start.
            </p>
          </div>

          <div className="mt-10" data-contact-sheet>
            <figure className="field-note-photo relative overflow-visible border border-warm/25 bg-sky" data-field-photo="1">
              <div className="relative aspect-[5/3] overflow-hidden">
                <Image
                  src="/images/events/family-science-night-altamont/drive-02.webp"
                  alt="An older student demonstrates a VEX robot to three younger students at Family Science Night."
                  fill
                  sizes="(max-width: 640px) 100vw, 62vw"
                  className="object-cover"
                />
              </div>
              <figcaption className="field-note-tape absolute bottom-[-0.7rem] left-3 max-w-[90%] px-3 py-2 text-xs font-semibold text-midnight">
                <span className="mr-2 font-display text-[0.58rem] font-bold uppercase tracking-[0.14em] text-cobalt">Field note 01</span>
                Family Science Night · teach it forward
              </figcaption>
            </figure>
          </div>

          <div className="mt-14 max-w-xl">
            <p className="font-display text-sm font-semibold uppercase tracking-[0.16em] text-sky">A build in four stages</p>
            <ol className="workshop-stage-readout mt-5" aria-label="Rover assembly stages">
              {stages.map((stage) => (
                <li key={stage.title} className="workshop-stage-readout__item">
                  <span className="workshop-stage-readout__marker" aria-hidden="true" />
                  <span>
                    <span className="workshop-stage-readout__number">{stage.number}</span>
                    <span className="workshop-stage-readout__title">{stage.title}</span>
                    <span className="mt-2 block text-xs leading-5 text-warm/65">{stage.text}</span>
                  </span>
                </li>
              ))}
            </ol>
            <p className="mt-8 text-[0.65rem] uppercase tracking-[0.16em] text-warm/50">
              Static workshop reference · no motion required
            </p>
          </div>
        </div>
      </section>
      <p className="sr-only">
        Every part has a purpose. The workshop reference follows a NASA and JPL-Caltech Perseverance rover through the
        ordered stages Frame, Motion, Sense, and Lead; large screens can scroll through the assembly, while smaller
        screens show a static Family Science Night demonstration and the same stage notes.
      </p>
    </>
  )
}
