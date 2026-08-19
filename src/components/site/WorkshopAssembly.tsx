import DesktopWorkshopAssemblyLoader from '@/components/site/WorkshopAssemblyDesktopLoader'

export default function WorkshopAssembly() {
  return (
    <>
      <DesktopWorkshopAssemblyLoader />
      <p className="sr-only">
        Workshop assembly sequence: Access → Build → Lead. Scroll the story to open the case and assemble the rover,
        or enable reduced motion to view the final composition.
      </p>
    </>
  )
}
