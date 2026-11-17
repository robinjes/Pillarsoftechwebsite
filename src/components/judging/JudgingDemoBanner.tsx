'use client'

import { useState } from 'react'
import { secondaryButton } from '../feedback/admin-ui'

export default function JudgingDemoBanner() {
  const [error, setError] = useState('')
  async function reset() {
    try {
      const response = await fetch('/api/dev/judging/reset', { method: 'POST' })
      if (!response.ok) throw new Error()
      window.location.reload()
    } catch { setError('Could not reset the demo. Check that the dev server is running.') }
  }
  return <aside className="mb-6 border-2 border-midnight bg-sky p-4 text-midnight">
    <p className="font-bold">Local demo · Sample data · No Supabase</p>
    <p className="mt-1 text-sm">Try host controls below, open a judge screen to change scores, and generate OBS links. Changes stay in server memory until you reset or restart the dev server.</p>
    <div className="mt-3 flex flex-wrap gap-2">
      <a className={secondaryButton} href="/judging/demo/judge#code=DEMO22" target="_blank" rel="noopener noreferrer">Open demo judge (new tab)</a>
      <button className={secondaryButton} type="button" onClick={reset}>Reset sample data</button>
    </div>
    {error ? <p role="alert">{error}</p> : null}
  </aside>
}
