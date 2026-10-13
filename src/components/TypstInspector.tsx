import { Trash2, X } from 'lucide-react'
import type { TypstElement } from '../types'

type Props = {
  element: TypstElement
  onSourceChange: (source: string) => void
  onDelete: () => void
  onClose: () => void
}

export function TypstInspector({ element, onSourceChange, onDelete, onClose }: Props) {
  return (
    <aside className="inspector">
      <header className="inspector-header">
        <div>
          <strong>Text box</strong>
          <span>{Math.round(element.width)} × {Math.round(element.height)} pt</span>
        </div>
        <button className="icon-button" onClick={onClose} title="Close editor" aria-label="Close editor">
          <X size={16} />
        </button>
      </header>
      {element.error && <div className="compile-error">{element.error}</div>}
      <label className="source-label" htmlFor="typst-source">Text & Typst source</label>
      <textarea
        id="typst-source"
        className="source-editor"
        value={element.source}
        onChange={(event) => onSourceChange(event.target.value)}
        placeholder="Write text or Typst markup…"
        spellCheck={false}
      />
      <div className="inspector-footer">
        <span>Preview updates as you type.</span>
        <button className="danger-button" onClick={onDelete}>
          <Trash2 size={14} /> Delete box
        </button>
      </div>
    </aside>
  )
}
