'use client'

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, background: '#DED5C7', color: '#17334D', fontFamily: 'system-ui, sans-serif' }}>
        <main style={{ maxWidth: '48rem', margin: '0 auto', padding: '6rem 1.25rem' }}>
          <div style={{ borderRadius: '2rem', background: '#B9DDEC', padding: '3rem' }}>
            <p style={{ fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>A temporary pause</p>
            <h1 style={{ fontSize: 'clamp(2.75rem, 8vw, 5rem)', lineHeight: 1, margin: '1rem 0' }}>Something went wrong.</h1>
            <p style={{ fontSize: '1.2rem', lineHeight: 1.6 }}>The site could not finish loading. Try again, or use Contact to reach the Pillars of Tech team.</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginTop: '2rem' }}>
              <button type="button" onClick={() => reset()} style={{ minHeight: '3.25rem', border: 0, borderRadius: '999px', padding: '0.8rem 1.4rem', background: '#0D2B4A', color: '#F7F3EB', fontWeight: 700, fontSize: '1rem' }}>Reload</button>
              <a href="/contact" style={{ minHeight: '3.25rem', display: 'inline-flex', alignItems: 'center', borderRadius: '999px', padding: '0.8rem 1.4rem', border: '2px solid #0D2B4A', color: '#0D2B4A', fontWeight: 700 }}>Contact the team</a>
            </div>
          </div>
        </main>
      </body>
    </html>
  )
}
