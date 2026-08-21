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
        <div className="site-shell relative z-10 mx-auto px-5 py-20 sm:px-8 lg:px-10">
          <div className="max-w-xl">
            <p className="eyebrow text-sky">One system at a time</p>
            <h2 id="workshop-static-heading" className="display-heading mt-4 max-w-md text-4xl text-warm sm:text-5xl">
              Every part has a purpose.
            </h2>
            <p className="mt-5 max-w-md text-base leading-7 text-warm/75">
              The interactive rover study is designed for patient looking: each system has a job, and every finished
              build gives the next question somewhere to start.
            </p>
          </div>

          <figure className="mt-10 max-w-2xl border border-warm/25 bg-midnight">
            <div className="relative aspect-[5/3] overflow-hidden">
              <Image
                src="/images/events/family-science-night-altamont/drive-02.webp"
                alt="An older student demonstrates a VEX robot to three younger students at Family Science Night."
                fill
                sizes="(max-width: 640px) 100vw, 62vw"
                className="object-cover"
              />
            </div>
            <figcaption className="border-t border-warm/20 px-4 py-3 text-sm text-warm/70">
              Family Science Night · Altamont Creek
            </figcaption>
          </figure>

          <div className="mt-14 max-w-xl">
            <p className="eyebrow text-sky">Rover sequence</p>
            <ol className="workshop-stage-list mt-5" aria-label="Rover assembly stages">
              {stages.map((stage) => (
                <li key={stage.title} className="workshop-stage-list__item">
                  <span className="workshop-stage-list__marker" aria-hidden="true" />
                  <span>
                    <span className="workshop-stage-list__number">{stage.number}</span>
                    <span className="workshop-stage-list__title">{stage.title}</span>
                    <span className="mt-2 block text-xs leading-5 text-warm/65">{stage.text}</span>
                  </span>
                </li>
              ))}
            </ol>
            <p className="mt-8 text-sm leading-6 text-warm/55">
              Smaller screens show the same sequence as a quiet, static reference.
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
