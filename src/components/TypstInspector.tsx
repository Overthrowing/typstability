import { Trash2, X } from 'lucide-react'
import type { TypstElement } from '../types'
import { DEFAULT_TYPST_TOP_INSET } from '../typst/source'

type Props = {
  element: TypstElement
  onSourceChange: (source: string) => void
  onTopInsetChange: (topInset: number) => void
  onPageFillChange: (pageFill: string) => void
  onDelete: () => void
  onClose: () => void
}

export function TypstInspector({ element, onSourceChange, onTopInsetChange, onPageFillChange, onDelete, onClose }: Props) {
  return (
    <aside className="inspector">
      <header className="inspector-header">
        <div>
          <strong>Typst</strong>
          <span>{Math.round(element.width)} × {Math.round(element.height)} pt</span>
        </div>
        <button className="icon-button" onClick={onClose} title="Close editor" aria-label="Close editor">
          <X size={16} />
        </button>
      </header>
      {element.error && <div className="compile-error">{element.error}</div>}
      <label className="typst-inset-control" htmlFor="typst-top-inset">
        <span>Top inset</span>
        <input
          id="typst-top-inset"
          type="number"
          min="0"
          max="200"
          step="1"
          value={element.topInset ?? DEFAULT_TYPST_TOP_INSET}
          onChange={(event) => {
            const value = Number(event.target.value)
            if (Number.isFinite(value)) onTopInsetChange(Math.min(200, Math.max(0, value)))
          }}
          aria-label="Top inset"
        />
        <span>pt</span>
      </label>
      <label className="source-label" htmlFor="typst-page-fill">Fill (Typst)</label>
      <input
        id="typst-page-fill"
        className="typst-fill-input"
        type="text"
        value={element.pageFill ?? ''}
        onChange={(event) => onPageFillChange(event.target.value)}
        placeholder="Inherit shared fill"
        spellCheck={false}
      />
      <p className="typst-fill-help">Default: white. Use <code>rgb("#f5f0e6")</code> or <code>none</code> here, or <code>#set page(fill: ...)</code> in Prelude for every box.</p>
      <label className="source-label" htmlFor="typst-source">Source</label>
      <textarea
        id="typst-source"
        className="source-editor"
        value={element.source}
        onChange={(event) => onSourceChange(event.target.value)}
        spellCheck={false}
      />
      <div className="inspector-footer">
        <span>Typst compiles locally.</span>
        <button className="danger-button" onClick={onDelete}>
          <Trash2 size={14} /> Delete
        </button>
      </div>
    </aside>
  )
}
