import { readFileSync } from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

const read = (relativePath: string) => readFileSync(path.resolve(process.cwd(), relativePath), 'utf8')

describe('silent timelapse hero behavior', () => {
  it('starts with Wildcat Tank, lazily loads Carnival, and alternates by end or interval', () => {
    const hero = read('src/components/site/TimelapseHero.tsx')

    expect(hero).toContain("const TANK_VIDEO = '/videos/home/wildcat-tank-timelapse-720p.mp4'")
    expect(hero).toContain("const CARNIVAL_VIDEO = '/videos/home/wildcat-carnival-timelapse-720p.mp4'")
    expect(hero).toContain("const TANK_POSTER = '/images/home/wildcat-tank-poster.jpg'")
    expect(hero).toContain("const CARNIVAL_POSTER = '/images/home/wildcat-carnival-poster.jpg'")
    expect(hero).toContain('useState(0)')
    expect(hero).toContain('preload="metadata"')
    expect(hero).toContain('preload="none"')
    expect(hero).toContain('video.preload = \'metadata\'')
    expect(hero).toContain('video.load()')
    expect(hero).toContain('window.setTimeout(advanceVideo, PLAYBACK_INTERVAL_MS)')
    expect(hero).toContain('onEnded={advanceVideo}')
    expect(hero).not.toContain('controls')
  })

  it('falls back to a static poster for reduced motion or autoplay failure and pauses on hidden pages', () => {
    const hero = read('src/components/site/TimelapseHero.tsx')
    expect(hero).toContain("window.matchMedia('(prefers-reduced-motion: reduce)')")
    expect(hero).toContain('setAutoplayFailed(true)')
    expect(hero).toContain('hero-media--poster-only')
    expect(hero).toContain("document.addEventListener('visibilitychange'")
    expect(hero).toContain('document.hidden')
    expect(hero).toContain('video?.pause()')
  })
})
