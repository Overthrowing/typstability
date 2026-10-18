import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useViewportZoom } from './use-viewport-zoom'

afterEach(() => { cleanup(); vi.unstubAllGlobals() })

it('allows manual overflow, then fits on the next drag and restores the preference as space returns', () => {
  let resized!: () => void
  const disconnect = vi.fn()
  vi.stubGlobal('ResizeObserver', class {
    constructor(callback: () => void) { resized = callback }
    observe() {}
    disconnect = disconnect
  })
  let width = 900
  const viewport = document.createElement('main')
  viewport.getBoundingClientRect = () => ({ width }) as DOMRect
  Object.defineProperty(viewport, 'clientWidth', { get: () => width })
  const ref = { current: viewport }
  const hook = renderHook(() => useViewportZoom(ref, 612, true))
  expect(hook.result.current[0]).toBe(0.9)
  act(() => { width = 400; resized() })
  expect(hook.result.current[0]).toBeCloseTo(352 / 612)
  act(() => hook.result.current[1](1.2))
  expect(hook.result.current[0]).toBe(1.2)
  // A content-induced observer notification must not undo a manual override.
  act(() => resized())
  expect(hook.result.current[0]).toBe(1.2)
  act(() => { width = 380; resized() })
  expect(hook.result.current[0]).toBeCloseTo(332 / 612)
  act(() => { width = 1000; resized() })
  expect(hook.result.current[0]).toBe(1.2)
  hook.unmount()
  expect(disconnect).toHaveBeenCalled()
})

describe('workspace lifecycle', () => {
  it('observes after opening a project and refits for wider pages', () => {
    vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} })
    const viewport = document.createElement('main')
    viewport.getBoundingClientRect = () => ({ width: 600 }) as DOMRect
    Object.defineProperty(viewport, 'clientWidth', { value: 600 })
    const ref = { current: viewport }
    const hook = renderHook(({ enabled, width }) => useViewportZoom(ref, width, enabled), { initialProps: { enabled: false, width: 612 } })
    hook.rerender({ enabled: true, width: 612 })
    expect(hook.result.current[0]).toBe(0.9)
    hook.rerender({ enabled: true, width: 1000 })
    expect(hook.result.current[0]).toBeCloseTo(0.552)
  })
})
