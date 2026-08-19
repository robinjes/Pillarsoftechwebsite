import DesktopWorkshopAssemblyLoader from '@/components/site/WorkshopAssemblyDesktopLoader'

export default function WorkshopAssembly() {
  return (
    <>
      <DesktopWorkshopAssemblyLoader />
      <p className="sr-only">
        Every part has a purpose. Scroll to bring a NASA and JPL-Caltech Perseverance rover reference model together one
        system at a time: Frame, Motion, Sense, and Lead. Enable reduced motion to view the final composition.
      </p>
    </>
  )
}
