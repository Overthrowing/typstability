import { describe, expect, it } from 'vitest'
import { DEFAULT_TYPST_TOP_INSET, wrapSource } from './source'

describe('Typst box inset', () => {
  it('reserves a default top margin without changing the shared prelude', () => {
    const result = wrapSource('Hello', '#let brand = blue', 100, 50)
    expect(DEFAULT_TYPST_TOP_INSET).toBe(4)
    expect(result).toContain('#let brand = blue')
    expect(result).toContain('width: 100pt, height: 50pt')
    expect(result).toContain('top: 4pt')
    expect(result).toContain('Hello')
  })

  it('supports a zero inset and caps it for very small boxes', () => {
    expect(wrapSource('', '', 100, 50, 0)).toContain('top: 0pt')
    expect(wrapSource('', '', 1, 0.2, 20)).toContain('top: 0.1pt')
  })
})

describe('Typst box fill', () => {
  it('defaults to white and lets the Prelude change fill without changing box geometry', () => {
    const result = wrapSource('Hello', '#set page(fill: red)', 100, 50)
    expect(result).toContain('#set page(fill: white)')
    expect(result.indexOf('#set page(fill: white)')).toBeLessThan(result.indexOf('#set page(fill: red)'))
    expect(result.indexOf('#set page(fill: red)')).toBeLessThan(result.indexOf('#set page(width: 100pt, height: 50pt'))
    expect(result).not.toContain('fill: none')
  })

  it('applies a per-box Typst expression after the Prelude', () => {
    const result = wrapSource('Hello', '#set page(fill: red)', 100, 50, 4, 'rgb("#f5f0e6")')
    expect(result).toContain('#set page(fill: rgb("#f5f0e6"))')
    expect(result.indexOf('#set page(fill: rgb("#f5f0e6"))')).toBeGreaterThan(result.indexOf('#set page(fill: red)'))
    expect(wrapSource('Hello', '', 100, 50, 4, 'none')).toContain('#set page(fill: none)')
  })
})
