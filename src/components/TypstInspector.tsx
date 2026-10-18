import { CompileErrors } from './CompileErrors'
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
      <CompileErrors key={documentKey} error={element.error} />
      <TypstCodeEditor
        key={documentKey}
        documentKey={documentKey}
        sessions={sessions}
        label="Text & Typst source"
        value={element.source}
        onChange={onSourceChange}
        placeholder="Write text or Typst markup…"
        footerAction={<button className="icon-button delete-source" onClick={onDelete} title="Delete text box" aria-label="Delete text box"><Trash2 size={15} /></button>}
      />
    </InspectorPanel>
  )
}
