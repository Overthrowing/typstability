import { useEffect, useId, useRef, useState, type ReactNode } from 'react'

const WIDTH_KEY = 'typstability-editor-width'
const DEFAULT_WIDTH = 360
const MIN_WIDTH = 300
const maxWidth = () => Math.max(MIN_WIDTH, Math.min(840, window.innerWidth - 360))
const clampWidth = (width: number) => Math.round(Math.max(MIN_WIDTH, Math.min(maxWidth(), width)))

function readWidth() {
  try {
    const saved = Number(localStorage.getItem(WIDTH_KEY))
    return clampWidth(Number.isFinite(saved) && saved >= MIN_WIDTH ? saved : DEFAULT_WIDTH)
  } catch { return clampWidth(DEFAULT_WIDTH) }
}

export function InspectorPanel({ label, children }: { label: string; children: ReactNode }) {
  const id = useId()
  const [width, setWidth] = useState(readWidth)
  const [resizing, setResizing] = useState(false)
  const drag = useRef<{ x: number; width: number } | null>(null)

  useEffect(() => {
    if (!resizing) {
      try { localStorage.setItem(WIDTH_KEY, String(width)) } catch { /* Resizing works without storage. */ }
    }
  }, [width, resizing])

  useEffect(() => {
    const resize = () => setWidth((current) => clampWidth(current))
    window.addEventListener('resize', resize)
    return () => window.removeEventListener('resize', resize)
  }, [])

  const finishResize = () => { drag.current = null; setResizing(false) }

  return (
    <aside id={id} aria-label={label} className={`inspector${resizing ? ' is-resizing' : ''}`} style={{ width }}>
      <div
        className="inspector-resizer"
        role="separator"
        tabIndex={0}
        aria-label="Resize editor sidebar"
        aria-controls={id}
        aria-orientation="vertical"
        aria-valuemin={MIN_WIDTH}
        aria-valuemax={maxWidth()}
        aria-valuenow={width}
        aria-valuetext={`${width} pixels wide`}
        title="Drag to resize · double-click to reset · arrow keys to adjust"
        onPointerDown={(event) => {
          if (event.button !== 0) return
          event.preventDefault()
          event.currentTarget.focus()
          event.currentTarget.setPointerCapture(event.pointerId)
          drag.current = { x: event.clientX, width }
          setResizing(true)
        }}
        onPointerMove={(event) => {
          if (drag.current) setWidth(clampWidth(drag.current.width + drag.current.x - event.clientX))
        }}
        onPointerUp={finishResize}
        onPointerCancel={finishResize}
        onLostPointerCapture={finishResize}
        onDoubleClick={() => setWidth(clampWidth(DEFAULT_WIDTH))}
        onKeyDown={(event) => {
          const next = event.key === 'ArrowLeft' ? width + 24
            : event.key === 'ArrowRight' ? width - 24
              : event.key === 'Home' ? MIN_WIDTH
                : event.key === 'End' ? maxWidth() : null
          if (next === null) return
          event.preventDefault()
          event.stopPropagation()
          setWidth(clampWidth(next))
        }}
      />
      {children}
    </aside>
  )
}
