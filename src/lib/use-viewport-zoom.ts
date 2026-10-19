import { useCallback, useLayoutEffect, useState, type RefObject, type SetStateAction } from 'react'

// Manual zoom is allowed to overflow. Only a new viewport size (for example,
// dragging the sidebar) reapplies fitting, capped by the user's preferred zoom.
export function useViewportZoom(viewportRef: RefObject<HTMLElement | null>, pageWidth: number, enabled: boolean) {
  const [{ zoom }, setState] = useState({ zoom: 0.9, preferred: 0.9 })
  const setZoom = useCallback((next: SetStateAction<number>) => {
    setState((current) => {
      const value = typeof next === 'function' ? next(current.zoom) : next
      return { zoom: value, preferred: value }
    })
  }, [])

  useLayoutEffect(() => {
    const viewport = viewportRef.current
    if (!enabled || !viewport || pageWidth <= 0) return
    let previousWidth = -1
    const fit = () => {
      // Ignore scrollbar/content changes caused by manual zoom. The outer
      // viewport width changes only when the workspace layout actually changes.
      const outerWidth = viewport.getBoundingClientRect().width
      if (outerWidth <= 0 || outerWidth === previousWidth) return
      previousWidth = outerWidth
      const availableWidth = Math.max(1, viewport.clientWidth - 48)
      setState((current) => ({ ...current, zoom: Math.min(current.preferred, availableWidth / pageWidth) }))
    }
    fit()
    const observer = new ResizeObserver(fit)
    observer.observe(viewport, { box: 'border-box' })
    return () => observer.disconnect()
  }, [enabled, pageWidth, viewportRef])

  return [zoom, setZoom] as const
}
