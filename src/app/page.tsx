import type { PublicEvent } from '@/lib/content-contracts'
import { listPublicEvents } from '@/lib/content-repository'
import TimelapseHero from '@/components/site/TimelapseHero'
import TrustStrip from '@/components/site/TrustStrip'
import FamiliesIntro from '@/components/site/FamiliesIntro'
import NextEventSection from '@/components/site/NextEventSection'
import EventProof from '@/components/site/EventProof'
import MissionSection from '@/components/site/MissionSection'
import BranchesSection from '@/components/site/BranchesSection'
import FinanceSection from '@/components/site/FinanceSection'
import ContactCta from '@/components/site/ContactCta'

function selectNextEvent(events: PublicEvent[]): PublicEvent | null {
  return events.find((event) => event.status === 'upcoming' || event.status === 'ongoing') ?? null
}
export default async function Home() {
  // The repository owns its safe checked-in fallback when Supabase is missing
  // or unavailable. Catching here keeps the family homepage useful even when
  // both the live read and its fallback are temporarily unavailable.
  const events = await listPublicEvents().catch(() => [] as PublicEvent[])
  const nextEvent = selectNextEvent(events)

  return (
    <main>
      <TimelapseHero />
      <TrustStrip />
      <FamiliesIntro />
      <NextEventSection event={nextEvent} />
      <EventProof />
      <MissionSection />
      <BranchesSection />
      <FinanceSection />
      <ContactCta />
    </main>
  )
}
