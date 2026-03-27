'use client'

import { useEffect, useRef, useState } from 'react'

type PodiumEntry = {
  productName: string
  total: number
  rank: number
  videoUrl?: string
  timestampLabel?: string
}

type WildcatTankPodiumProps = {
  topThree: PodiumEntry[]
  remainingResults: PodiumEntry[]
}

const getOrdinalLabel = (value: number) => {
  const mod10 = value % 10
  const mod100 = value % 100

  if (mod10 === 1 && mod100 !== 11) return `${value}st`
  if (mod10 === 2 && mod100 !== 12) return `${value}nd`
  if (mod10 === 3 && mod100 !== 13) return `${value}rd`

  return `${value}th`
}

export default function WildcatTankPodium({ topThree, remainingResults }: WildcatTankPodiumProps) {
  const [pendingVideo, setPendingVideo] = useState<PodiumEntry | null>(null)
  const [countdown, setCountdown] = useState(5)
  const redirectWindowRef = useRef<Window | null>(null)

  const prepareRedirectWindow = () => {
    const redirectWindow = window.open('', '_blank')
    if (!redirectWindow) {
      redirectWindowRef.current = null
      return
    }

    redirectWindow.opener = null
    redirectWindow.document.title = 'Redirecting To YouTube...'
    redirectWindow.document.body.innerHTML = `
      <style>
        @keyframes wtSpin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        @keyframes wtPulse {
          0%, 100% { opacity: 0.55; transform: scale(0.9); }
          50% { opacity: 1; transform: scale(1); }
        }

        @keyframes wtSweep {
          0% { transform: translateX(-140%); }
          100% { transform: translateX(320%); }
        }
      </style>
      <div style="margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:linear-gradient(180deg,#0f172a,#1d4ed8);color:white;font-family:Arial,sans-serif;padding:24px;box-sizing:border-box;">
        <div style="position:relative;width:100%;max-width:520px;">
          <div style="position:absolute;inset:12px;border-radius:28px;background:radial-gradient(circle at top, rgba(103,232,249,0.18), transparent 62%);filter:blur(18px);"></div>
          <div style="position:relative;border:1px solid rgba(255,255,255,0.18);background:rgba(255,255,255,0.08);backdrop-filter:blur(16px);padding:32px;border-radius:28px;text-align:center;box-shadow:0 18px 45px rgba(15,23,42,0.35);overflow:hidden;">
            <div style="position:absolute;inset:0;background:linear-gradient(120deg, transparent 0%, rgba(255,255,255,0.08) 25%, transparent 50%, rgba(96,165,250,0.1) 75%, transparent 100%);opacity:0.55;"></div>
            <div style="position:relative;font-size:12px;font-weight:700;letter-spacing:0.35em;text-transform:uppercase;color:#bfdbfe;">Please Wait</div>
            <div style="position:relative;margin:24px auto 0;width:96px;height:96px;">
              <div style="position:absolute;inset:0;border-radius:999px;border:2px solid rgba(255,255,255,0.14);"></div>
              <div style="position:absolute;inset:8px;border-radius:999px;border:4px solid transparent;border-top-color:#67e8f9;border-right-color:#93c5fd;animation:wtSpin 1.15s linear infinite;"></div>
              <div style="position:absolute;inset:24px;border-radius:999px;background:radial-gradient(circle, rgba(255,255,255,1) 0%, rgba(191,219,254,0.92) 38%, rgba(59,130,246,0.16) 72%, transparent 100%);animation:wtPulse 1.4s ease-in-out infinite;"></div>
            </div>
            <h1 style="position:relative;margin:22px 0 0;font-size:32px;line-height:1.2;">Your YouTube clip is loading...</h1>
            <p style="position:relative;margin:18px 0 0;font-size:16px;line-height:1.8;color:#dbeafe;">The selected Wildcat Tank presentation will open here shortly.</p>
            <div style="position:relative;margin:20px auto 0;display:flex;align-items:center;justify-content:center;gap:10px;font-size:12px;font-weight:700;letter-spacing:0.22em;text-transform:uppercase;color:#bfdbfe;">
              <span style="width:8px;height:8px;border-radius:999px;background:#67e8f9;box-shadow:0 0 16px rgba(103,232,249,0.95);animation:wtPulse 1.1s ease-in-out infinite;"></span>
              Preparing your clip in a new tab
            </div>
            <div style="position:relative;margin:22px auto 0;height:8px;width:100%;max-width:260px;overflow:hidden;border-radius:999px;background:rgba(255,255,255,0.12);">
              <div style="position:absolute;inset-y:0;left:0;width:42%;border-radius:999px;background:linear-gradient(90deg,transparent,#67e8f9,#ffffff,#67e8f9,transparent);box-shadow:0 0 18px rgba(147,197,253,0.75);animation:wtSweep 1.45s ease-in-out infinite;"></div>
            </div>
          </div>
        </div>
      </div>
    `

    redirectWindowRef.current = redirectWindow
  }

  const openSelectedVideo = (videoUrl: string) => {
    const redirectWindow = redirectWindowRef.current
    redirectWindowRef.current = null

    if (redirectWindow && !redirectWindow.closed) {
      redirectWindow.location.href = videoUrl
      redirectWindow.focus()
    } else {
      window.open(videoUrl, '_blank', 'noopener,noreferrer')
    }

    setPendingVideo(null)
  }

  const cancelPendingRedirect = () => {
    const redirectWindow = redirectWindowRef.current

    if (redirectWindow && !redirectWindow.closed) {
      redirectWindow.close()
    }

    redirectWindowRef.current = null
    setPendingVideo(null)
  }

  const handleVideoClick = (entry: PodiumEntry) => {
    if (!entry.videoUrl) {
      return
    }

    prepareRedirectWindow()
    setPendingVideo(entry)
  }

  useEffect(() => {
    if (!pendingVideo?.videoUrl) {
      return
    }

    setCountdown(5)

    const startedAt = Date.now()
    const intervalId = window.setInterval(() => {
      const elapsedSeconds = Math.floor((Date.now() - startedAt) / 1000)
      setCountdown(Math.max(0, 5 - elapsedSeconds))
    }, 250)

    const timeoutId = window.setTimeout(() => {
      openSelectedVideo(pendingVideo.videoUrl!)
    }, 5000)

    return () => {
      window.clearInterval(intervalId)
      window.clearTimeout(timeoutId)
    }
  }, [pendingVideo])

  useEffect(() => {
    if (!pendingVideo) {
      return
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        const redirectWindow = redirectWindowRef.current

        if (redirectWindow && !redirectWindow.closed) {
          redirectWindow.close()
        }

        redirectWindowRef.current = null
        setPendingVideo(null)
      }
    }

    window.addEventListener('keydown', onKeyDown)

    return () => {
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [pendingVideo])

  const redirectNow = () => {
    if (!pendingVideo?.videoUrl) {
      return
    }

    openSelectedVideo(pendingVideo.videoUrl)
  }

  return (
    <>
      <div className="mt-8 grid gap-5 lg:grid-cols-3 lg:items-end">
        {topThree.map((entry) => {
          const isFirst = entry.rank === 1
          const isSecond = entry.rank === 2

          const columnHeight = isFirst
            ? 'h-56 sm:h-72'
            : isSecond
              ? 'h-40 sm:h-56'
              : 'h-28 sm:h-40'

          const capitalHeight = isFirst
            ? 'h-10 sm:h-14'
            : isSecond
              ? 'h-8 sm:h-12'
              : 'h-7 sm:h-10'

          const baseHeight = isFirst
            ? 'h-6 sm:h-8'
            : isSecond
              ? 'h-5 sm:h-7'
              : 'h-4 sm:h-6'

          const columnWidth = isFirst
            ? 'w-24 sm:w-36'
            : isSecond
              ? 'w-20 sm:w-32'
              : 'w-16 sm:w-28'

          const plaqueWidth = isFirst
            ? 'w-40 sm:w-56'
            : isSecond
              ? 'w-36 sm:w-48'
              : 'w-32 sm:w-44'

          const badgeClassName = isFirst
            ? 'border-amber-300/80 bg-amber-50 text-amber-700'
            : isSecond
              ? 'border-slate-300/90 bg-slate-100 text-slate-600'
              : 'border-orange-300/80 bg-orange-50 text-orange-700'

          const glowClass = isFirst
            ? 'drop-shadow-[0_0_18px_rgba(253,224,71,0.35)]'
            : isSecond
              ? 'drop-shadow-[0_0_12px_rgba(203,213,225,0.3)]'
              : 'drop-shadow-[0_0_8px_rgba(180,140,100,0.2)]'

          const orderClassName = isFirst
            ? 'lg:order-2'
            : isSecond
              ? 'lg:order-1'
              : 'lg:order-3'

          const hasVideo = Boolean(entry.videoUrl)
          const wrapperClassName = hasVideo
            ? `group flex flex-col items-center rounded-sm border-0 bg-transparent p-0 text-left transition-transform duration-200 hover:-translate-y-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 ${orderClassName}`
            : `group flex flex-col items-center ${orderClassName}`

          const podiumContent = (
            <>
              <div
                className={`mb-5 rounded-[1.6rem] border border-white/60 bg-[linear-gradient(180deg,rgba(255,255,255,0.95),rgba(241,245,249,0.84))] px-4 py-4 text-center shadow-[0_16px_34px_rgba(15,23,42,0.2)] backdrop-blur-sm ${plaqueWidth}`}
              >
                <span
                  className={`inline-flex rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.24em] sm:text-xs ${badgeClassName}`}
                >
                  {isFirst ? 'First Place' : isSecond ? 'Second Place' : 'Third Place'}
                </span>
                <h3 className="mt-3 text-base font-black leading-tight text-slate-800 sm:text-xl">
                  {entry.productName}
                </h3>
                <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-bold text-slate-600 sm:text-xs">
                    {entry.total.toLocaleString()} points
                  </span>
                  {entry.timestampLabel ? (
                    <span className="rounded-full bg-indigo-50 px-3 py-1 text-[11px] font-semibold text-indigo-700 sm:text-xs">
                      Clip {entry.timestampLabel}
                    </span>
                  ) : null}
                </div>
                {hasVideo ? (
                  <p className="mt-3 text-[11px] font-bold uppercase tracking-[0.22em] text-indigo-600 transition-colors group-hover:text-indigo-700 sm:text-xs">
                    Open Presentation Clip
                  </p>
                ) : null}
              </div>

              <div className={`relative ${columnWidth} ${capitalHeight} ${glowClass}`}>
                <div
                  className="absolute left-0 right-0 top-0 h-[22%] rounded-sm"
                  style={{
                    background:
                      'linear-gradient(180deg, #f5f5f0 0%, #e8e8e2 50%, #d8d8d2 100%)',
                    boxShadow:
                      'inset 0 2px 4px rgba(255,255,255,0.9), inset 0 -1px 2px rgba(0,0,0,0.1), 0 1px 3px rgba(0,0,0,0.15)',
                  }}
                />
                <div
                  className="absolute left-0 right-0 h-[20%]"
                  style={{
                    top: '22%',
                    background: 'linear-gradient(180deg, #e8e8e2 0%, #dcdcd6 100%)',
                    borderRadius: '0 0 40% 40% / 0 0 60% 60%',
                    boxShadow: 'inset 0 -2px 4px rgba(0,0,0,0.08)',
                  }}
                />
                <div
                  className="absolute"
                  style={{
                    left: '-10%',
                    top: '22%',
                    width: '22%',
                    height: '56%',
                    background: 'linear-gradient(135deg, #e0e0da 0%, #c8c8c2 50%, #d8d8d2 100%)',
                    borderRadius: '50% 0 0 50%',
                    boxShadow: 'inset 2px 0 4px rgba(0,0,0,0.1), -1px 2px 4px rgba(0,0,0,0.12)',
                  }}
                />
                <div
                  className="absolute"
                  style={{
                    left: '-4%',
                    top: '34%',
                    width: '10%',
                    height: '32%',
                    background: 'linear-gradient(135deg, #d0d0ca 0%, #b8b8b2 100%)',
                    borderRadius: '50%',
                    boxShadow: 'inset 1px 1px 3px rgba(0,0,0,0.15)',
                  }}
                />
                <div
                  className="absolute"
                  style={{
                    right: '-10%',
                    top: '22%',
                    width: '22%',
                    height: '56%',
                    background: 'linear-gradient(225deg, #e0e0da 0%, #c8c8c2 50%, #d8d8d2 100%)',
                    borderRadius: '0 50% 50% 0',
                    boxShadow: 'inset -2px 0 4px rgba(0,0,0,0.1), 1px 2px 4px rgba(0,0,0,0.12)',
                  }}
                />
                <div
                  className="absolute"
                  style={{
                    right: '-4%',
                    top: '34%',
                    width: '10%',
                    height: '32%',
                    background: 'linear-gradient(225deg, #d0d0ca 0%, #b8b8b2 100%)',
                    borderRadius: '50%',
                    boxShadow: 'inset -1px 1px 3px rgba(0,0,0,0.15)',
                  }}
                />
                <div
                  className="absolute left-[8%] right-[8%]"
                  style={{
                    top: '40%',
                    bottom: 0,
                    background: 'linear-gradient(180deg, #dcdcd6 0%, #e4e4de 100%)',
                    boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.6)',
                  }}
                />
              </div>

              <div
                className={`relative ${columnWidth} ${columnHeight} overflow-hidden`}
                style={{
                  background: `
                    repeating-linear-gradient(
                      90deg,
                      rgba(255,255,255,0.55) 0px,
                      rgba(220,220,215,0.3) 3px,
                      rgba(200,200,195,0.4) 5px,
                      rgba(230,230,225,0.25) 7px,
                      rgba(255,255,255,0.45) 9px
                    ),
                    linear-gradient(
                      180deg,
                      #ebebe6 0%,
                      #f0f0eb 10%,
                      #e6e6e1 40%,
                      #dcdcd7 70%,
                      #d8d8d3 90%,
                      #d0d0cb 100%
                    )
                  `,
                  boxShadow:
                    'inset 3px 0 6px rgba(255,255,255,0.7), inset -3px 0 6px rgba(0,0,0,0.08), 2px 0 6px rgba(0,0,0,0.1), -2px 0 6px rgba(0,0,0,0.05)',
                }}
              >
                {[15, 30, 45, 60, 75].map((pct) => (
                  <div
                    key={pct}
                    className="absolute bottom-0 top-0 w-px"
                    style={{
                      left: `${pct}%`,
                      background:
                        'linear-gradient(180deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.6) 20%, rgba(255,255,255,0.6) 80%, rgba(255,255,255,0) 100%)',
                    }}
                  />
                ))}
                {[20, 45, 68, 85].map((pct) => (
                  <div
                    key={pct}
                    className="absolute left-0 right-0 h-px opacity-20"
                    style={{
                      top: `${pct}%`,
                      background:
                        'linear-gradient(90deg, transparent 0%, rgba(160,150,140,0.5) 20%, rgba(160,150,140,0.5) 80%, transparent 100%)',
                    }}
                  />
                ))}
              </div>

              <div className={`relative ${columnWidth}`}>
                <div
                  className={`w-full ${baseHeight}`}
                  style={{
                    background: 'linear-gradient(180deg, #e8e8e3 0%, #d8d8d3 50%, #ccccc7 100%)',
                    boxShadow:
                      'inset 0 2px 3px rgba(255,255,255,0.8), 0 2px 4px rgba(0,0,0,0.12)',
                    borderRadius: '2px 2px 0 0',
                  }}
                />
                <div
                  className="h-3 w-[108%] -mx-[4%] sm:h-4"
                  style={{
                    background: 'linear-gradient(180deg, #dcdcd7 0%, #ccccc7 100%)',
                    boxShadow:
                      'inset 0 1px 2px rgba(255,255,255,0.5), 0 2px 4px rgba(0,0,0,0.1)',
                  }}
                />
                <div
                  className="h-3 w-[116%] -mx-[8%] sm:h-4"
                  style={{
                    background: 'linear-gradient(180deg, #d0d0cb 0%, #c4c4bf 100%)',
                    boxShadow:
                      'inset 0 1px 2px rgba(255,255,255,0.4), 0 3px 6px rgba(0,0,0,0.12)',
                    borderRadius: '0 0 2px 2px',
                  }}
                />
                <div
                  className="h-1 w-[120%] -mx-[10%] rounded-full sm:h-1.5"
                  style={{
                    background:
                      'radial-gradient(ellipse at center, rgba(0,0,0,0.18) 0%, transparent 70%)',
                  }}
                />
              </div>
            </>
          )

          return hasVideo ? (
            <button
              key={entry.rank}
              type="button"
              onClick={() => handleVideoClick(entry)}
              aria-label={`Watch ${entry.productName} presentation clip`}
              className={wrapperClassName}
            >
              {podiumContent}
            </button>
          ) : (
            <article key={entry.rank} className={wrapperClassName}>
              {podiumContent}
            </article>
          )
        })}
      </div>

      <div className="mt-8 overflow-hidden rounded-3xl border border-white/10">
        <div className="grid grid-cols-[82px_minmax(0,1fr)_120px] bg-[#5a4ec4] px-4 py-3 text-sm font-bold text-white sm:grid-cols-[100px_minmax(0,1fr)_140px]">
          <div>Place</div>
          <div>Product Name</div>
          <div className="text-right">Combined Total</div>
        </div>
        {remainingResults.map((entry) => {
          const hasVideo = Boolean(entry.videoUrl)

          return hasVideo ? (
            <button
              key={entry.productName}
              type="button"
              onClick={() => handleVideoClick(entry)}
              className="grid w-full grid-cols-[82px_minmax(0,1fr)_120px] items-center gap-2 border-t border-white/10 bg-[#f4f1ea] px-4 py-3 text-left text-sm text-slate-800 transition-colors duration-300 hover:bg-[#ebe7dd] sm:grid-cols-[100px_minmax(0,1fr)_140px]"
            >
              <div className="font-bold">{getOrdinalLabel(entry.rank)}</div>
              <div className="font-medium">
                {entry.productName}
                <span className="ml-3 inline-flex rounded-full border border-slate-300/90 bg-white/70 px-2 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-slate-600">
                  {entry.timestampLabel ? `Clip ${entry.timestampLabel}` : 'Video'}
                </span>
              </div>
              <div className="text-right font-bold">{entry.total}</div>
            </button>
          ) : (
            <div
              key={entry.productName}
              className="grid grid-cols-[82px_minmax(0,1fr)_120px] items-center gap-2 border-t border-white/10 bg-[#f4f1ea] px-4 py-3 text-sm text-slate-800 sm:grid-cols-[100px_minmax(0,1fr)_140px]"
            >
              <div className="font-bold">{getOrdinalLabel(entry.rank)}</div>
              <div className="font-medium">{entry.productName}</div>
              <div className="text-right font-bold">{entry.total}</div>
            </div>
          )
        })}
      </div>

      {pendingVideo?.videoUrl ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-md">
          <div
            className="absolute inset-0"
            aria-hidden="true"
            onClick={cancelPendingRedirect}
          />
          <div className="relative w-full max-w-xl">
            <div className="pointer-events-none absolute inset-4 rounded-[2rem] bg-[radial-gradient(circle_at_top,rgba(103,232,249,0.18),transparent_62%)] blur-2xl" />
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="youtube-redirect-title"
              className="relative w-full overflow-hidden rounded-[2rem] border border-white/20 bg-[linear-gradient(180deg,rgba(255,255,255,0.17),rgba(255,255,255,0.08))] p-6 shadow-2xl backdrop-blur-2xl sm:p-8"
            >
              <div className="pointer-events-none absolute inset-0 rounded-[2rem] bg-[linear-gradient(120deg,transparent_0%,rgba(255,255,255,0.08)_24%,transparent_48%,rgba(96,165,250,0.1)_72%,transparent_100%)] opacity-60" />
              <p className="relative text-sm font-black uppercase tracking-[0.32em] text-blue-200/90">
                Redirect Notice
              </p>
              <div className="relative mx-auto mt-6 flex h-24 w-24 items-center justify-center">
                <div className="absolute inset-0 rounded-full border border-white/15" />
                <div className="absolute inset-2 rounded-full border-[4px] border-transparent border-t-cyan-300 border-r-blue-300 animate-spin" />
                <div className="absolute inset-5 rounded-full bg-[radial-gradient(circle,rgba(255,255,255,1)_0%,rgba(191,219,254,0.9)_38%,rgba(59,130,246,0.14)_72%,transparent_100%)] animate-pulse" />
              </div>
              <h3 id="youtube-redirect-title" className="relative mt-4 text-3xl font-black text-white">
                You&apos;ll be redirected to YouTube in {countdown} seconds.
              </h3>
              <p className="relative mt-4 text-base leading-8 text-blue-50">
                We recommend turning on subtitles because the audio is a little hard to hear in this
                recording.
              </p>
              <div className="relative mt-5 rounded-2xl border border-white/15 bg-slate-950/30 px-4 py-4">
                <p className="text-xs font-black uppercase tracking-[0.24em] text-blue-300">
                  Selected Presentation
                </p>
                <p className="mt-2 text-xl font-black text-white">{pendingVideo.productName}</p>
                <p className="mt-2 text-sm font-semibold text-blue-100">
                  Starting at {pendingVideo.timestampLabel ?? 'the selected timestamp'}
                </p>
              </div>
              <div className="relative mt-6 h-2 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-cyan-300 via-blue-300 to-white transition-[width] duration-1000 ease-linear"
                  style={{ width: `${((5 - countdown) / 5) * 100}%` }}
                />
              </div>
              <div className="relative mt-4 flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-[0.22em] text-blue-200/85">
                <span className="h-2 w-2 rounded-full bg-cyan-300 shadow-[0_0_14px_rgba(103,232,249,0.9)] animate-pulse" />
                Preparing new tab
              </div>
              <div className="relative mt-6 flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={redirectNow}
                  className="rounded-full bg-white px-6 py-3 text-sm font-bold text-slate-900 transition-all hover:-translate-y-0.5 hover:bg-blue-50"
                >
                  Go To YouTube Now
                </button>
                <button
                  type="button"
                  onClick={cancelPendingRedirect}
                  className="rounded-full border border-white/20 bg-white/10 px-6 py-3 text-sm font-bold text-white transition-all hover:-translate-y-0.5 hover:bg-white/20"
                >
                  Stay On This Page
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
