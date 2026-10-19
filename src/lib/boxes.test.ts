import { describe, expect, it } from 'vitest'
import { canCreateBox, minimumBoxDimension } from './boxes'

describe('small text boxes', () => {
  it('allows a one-screen-pixel drag at the current zoom', () => {
    expect(canCreateBox({ width: 1 / 0.4, height: 1 / 0.4 }, 0.4)).toBe(true)
    expect(canCreateBox({ width: 0.2, height: 0.2 }, 5)).toBe(true)
    expect(canCreateBox({ width: 0, height: 4 }, 5)).toBe(false)
    expect(canCreateBox({ width: 0.1, height: 0.2 }, 5)).toBe(false)
    expect(minimumBoxDimension(5)).toBe(0.2)
  })
})
