import { describe, expect, it } from 'vitest'
import { isSupportedImageFile, placeImage } from './images'

describe('image insertion helpers', () => {
  it('accepts browser-supported image formats and rejects unrelated files', () => {
    expect(isSupportedImageFile(new File([], 'picture.webp', { type: 'image/webp' }))).toBe(true)
    expect(isSupportedImageFile(new File([], 'picture.gif', { type: '' }))).toBe(true)
    expect(isSupportedImageFile(new File([], 'notes.txt', { type: 'text/plain' }))).toBe(false)
    expect(isSupportedImageFile(new File([], 'fake.png', { type: 'image/svg+xml' }))).toBe(false)
  })

  it('fits tall images on the page and clamps dropped images within its bounds', () => {
    const image = { dataUrl: 'data:image/png;base64,AA==', mime: 'image/png' as const, naturalWidth: 400, naturalHeight: 1600 }
    const placed = placeImage(image, { width: 612, height: 792 }, { x: 610, y: 790 })
    expect(placed.height).toBeLessThanOrEqual(648)
    expect(placed.x + placed.width).toBeLessThanOrEqual(612)
    expect(placed.y + placed.height).toBeLessThanOrEqual(792)
  })
})
