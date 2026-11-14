import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('next/script', () => ({
  default: ({ onReady, onError }: { onReady: () => void; onError: () => void }) => (
    <><button onClick={onReady}>Load runtime</button><button onClick={onError}>Fail runtime</button></>
  ),
}))

import EventMotionPhotos from '@/components/EventMotionPhotos'

afterEach(() => {
  cleanup()
  delete window.MotionView
})

describe('MotionView event photos', () => {
  it('does not load an animation before event photos are available', () => {
    const { container } = render(<EventMotionPhotos images={[]} title="Career Panel" />)
    expect(container).toBeEmptyDOMElement()
  })

  it('uses actual event photos and the supplied carousel settings, and cleans up on pause and unmount', () => {
    const destroy = vi.fn()
    const mount = vi.fn(() => ({ destroy }))
    window.MotionView = { mount }
    const images = ['/images/events/career-panel-granada/photos/one.webp', '/images/events/career-panel-granada/photos/two.webp']
    const { unmount } = render(<EventMotionPhotos images={images} title="Career Panel" />)
    fireEvent.click(screen.getByText('Load runtime'))
    expect(mount).toHaveBeenCalledWith(screen.getByRole('img'), {
      familyKey: 'carousel', images, imageCount: 2, aspectId: '16:9', loopSec: 9,
      params: { count: 7, size: 0.4, gap: 0.3 },
      customBg: '#DED5C7', easePts: [0.4, 0, 0.2, 1],
    })
    fireEvent.click(screen.getByRole('button', { name: 'Pause photo animation' }))
    expect(destroy).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('button', { name: 'Play photo animation' })).toHaveAttribute('aria-pressed', 'true')
    fireEvent.click(screen.getByRole('button', { name: 'Play photo animation' }))
    expect(mount).toHaveBeenCalledTimes(2)
    unmount()
    expect(destroy).toHaveBeenCalledTimes(2)
  })

  it('removes the canvas when the external runtime fails', () => {
    const { container } = render(<EventMotionPhotos images={['/photo.webp']} title="STEM Into the Night" />)
    fireEvent.click(screen.getByText('Fail runtime'))
    expect(container).toBeEmptyDOMElement()
  })

  it('handles a runtime that cannot create a canvas context', () => {
    window.MotionView = { mount: () => { throw new Error('Canvas unavailable') } }
    const { container } = render(<EventMotionPhotos images={['/photo.webp']} title="STEM Into the Night" />)
    fireEvent.click(screen.getByText('Load runtime'))
    expect(container).toBeEmptyDOMElement()
  })
})
