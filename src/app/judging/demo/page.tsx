import JudgingHost from '@/components/judging/JudgingHost'
import JudgingDemoBanner from '@/components/judging/JudgingDemoBanner'

export default function JudgingDemoPage() {
  return <main className="min-h-screen bg-cream p-5 sm:p-8"><div className="mx-auto max-w-7xl"><JudgingDemoBanner /><JudgingHost demo /></div></main>
}
