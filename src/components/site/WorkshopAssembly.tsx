import Image from 'next/image'

import DesktopWorkshopAssemblyLoader from '@/components/site/WorkshopAssemblyDesktopLoader'
import { stages, visualStates } from '@/components/site/workshopAssemblyData'

export default function WorkshopAssembly() {
  return (
    <>
      <DesktopWorkshopAssemblyLoader />

      <section className="bg-sky lg:hidden" aria-labelledby="workshop-mobile-heading">
        <div className="site-shell mx-auto px-5 py-20 sm:px-8">
          <p className="mb-4 font-display text-sm font-bold uppercase tracking-[0.2em] text-midnight">Workshop Assembly</p>
          <h2 id="workshop-mobile-heading" className="display-heading text-4xl text-midnight sm:text-5xl">Access → Build → Lead.</h2>
          <div className="mt-10 grid gap-10">
            {stages.map((stage, index) => {
              const visual = visualStates[index]
              return (
                <article key={stage.number} className="border-t border-midnight/30 pt-5">
                  <div className="flex items-baseline justify-between gap-5">
                    <h3 className="font-display text-2xl font-semibold text-midnight">{stage.title}</h3>
                    <span className="font-display text-sm font-bold text-midnight">{stage.number}</span>
                  </div>
                  <div className="relative mt-6 aspect-[640/460] border border-midnight/30 p-3">
                    <Image
                      src={visual.src}
                      alt={visual.alt}
                      fill
                      sizes="(max-width: 640px) calc(100vw - 3rem), 40rem"
                      className="object-contain p-3"
                    />
                  </div>
                  <p className="mt-5 text-base leading-7 text-midnight/75">{stage.text}</p>
                </article>
              )
            })}
          </div>
        </div>
      </section>
    </>
  )
}
