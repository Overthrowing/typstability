import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { InspectorPanel } from './InspectorPanel'

afterEach(() => { cleanup(); localStorage.clear(); vi.unstubAllGlobals(); vi.restoreAllMocks() })

describe('resizable editor panel', () => {
  it('expands leftward, clamps its size, and remembers the width across editors', () => {
    vi.stubGlobal('innerWidth', 1200)
    vi.stubGlobal('PointerEvent', MouseEvent)
    const capture = vi.fn()
    const first = render(<InspectorPanel label="Text box editor">Source</InspectorPanel>)
    const separator = screen.getByRole('separator')
    separator.setPointerCapture = capture
    fireEvent.pointerDown(separator, { button: 0, clientX: 840 })
    fireEvent.pointerMove(separator, { clientX: 640 })
    fireEvent.pointerUp(separator)
    expect(separator).toHaveAttribute('aria-valuenow', '560')
    expect(capture).toHaveBeenCalled()
    first.unmount()
    render(<InspectorPanel label="Shared styles editor">Prelude</InspectorPanel>)
    const restored = screen.getByRole('separator')
    expect(restored).toHaveAttribute('aria-valuenow', '560')
    fireEvent.keyDown(restored, { key: 'End' })
    expect(restored).toHaveAttribute('aria-valuenow', '840')
    fireEvent.keyDown(restored, { key: 'ArrowLeft' })
    expect(restored).toHaveAttribute('aria-valuenow', '840')
    fireEvent.keyDown(restored, { key: 'Home' })
    fireEvent.keyDown(restored, { key: 'ArrowRight' })
    expect(restored).toHaveAttribute('aria-valuenow', '300')
    fireEvent.doubleClick(restored)
    expect(restored).toHaveAttribute('aria-valuenow', '360')
  })

  it('keeps the document accessible when the viewport shrinks and storage is blocked', () => {
    vi.stubGlobal('innerWidth', 1400)
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('Blocked') })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('Blocked') })
    render(<InspectorPanel label="Editor">Source</InspectorPanel>)
    fireEvent.keyDown(screen.getByRole('separator'), { key: 'End' })
    vi.stubGlobal('innerWidth', 1000)
    fireEvent(window, new Event('resize'))
    expect(screen.getByRole('separator')).toHaveAttribute('aria-valuenow', '640')
  })
})
