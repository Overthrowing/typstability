import { InspectorPanel } from './InspectorPanel'
import { Trash2, X } from 'lucide-react'
import type { TypstElement } from '../types'
import { TypstCodeEditor, type EditorSessions } from './TypstCodeEditor'

type Props = {
  element: TypstElement
  documentKey: string
  sessions: EditorSessions
  onSourceChange: (source: string) => void
  onDelete: () => void
  onClose: () => void
}

export function TypstInspector({ element, documentKey, sessions, onSourceChange, onDelete, onClose }: Props) {
  return (
    <InspectorPanel label="Text box editor">
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
      <TypstCodeEditor
        key={documentKey}
        documentKey={documentKey}
        sessions={sessions}
        label="Text & Typst source"
        value={element.source}
        onChange={onSourceChange}
        placeholder="Write text or Typst markup…"
      />
      <div className="inspector-footer">
        <span>Preview updates as you type.</span>
        <button className="danger-button" onClick={onDelete}>
          <Trash2 size={14} /> Delete box
        </button>
      </div>
    </InspectorPanel>
  )
}
