import { useCallback, useEffect, useRef, useState } from 'react'
import { AlignLeft, Search } from 'lucide-react'
import { basicSetup } from 'codemirror'
import { Annotation, EditorState, StateEffect, Transaction } from '@codemirror/state'
import { EditorView, keymap, placeholder as editorPlaceholder } from '@codemirror/view'
import { indentWithTab, isolateHistory } from '@codemirror/commands'
import { indentUnit } from '@codemirror/language'
import { openSearchPanel } from '@codemirror/search'
import { typst_lezer, typstLanguageData } from 'codemirror-lang-typst/lezer'
import { formatTypst } from '../typst/formatter'

type EditorSession = { state: EditorState; scrollTop: number }
export type EditorSessions = Map<string, EditorSession>
type Props = {
  documentKey: string
  sessions: EditorSessions
  value: string
  label: string
  placeholder: string
  onChange: (source: string) => void
}

const externalChange = Annotation.define<boolean>()
const theme = EditorView.theme({
  '&': { height: '100%', fontSize: '12px', color: '#243c40' },
  '&.cm-focused': { outline: 'none' },
  '.cm-scroller': { overflow: 'auto', fontFamily: 'ui-monospace, SFMono-Regular, monospace', lineHeight: '1.75' },
  '.cm-content': { padding: '12px 0', caretColor: '#087f8c' },
  '.cm-line': { padding: '0 10px' },
  '.cm-gutters': { background: '#f5faf9', color: '#849b9e', borderRight: '1px solid #e0eceb' },
  '.cm-activeLine, .cm-activeLineGutter': { background: '#edf7f6' },
  '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, ::selection': { background: '#c5e9e8' },
  '&.cm-focused .cm-matchingBracket': { background: '#bce5e5', outline: '1px solid #70b8bd' },
  '.cm-cursor, .cm-dropCursor': { borderLeftColor: '#087f8c' },
  '.cm-tooltip': { border: '1px solid #c8dedc', borderRadius: '6px', background: '#fff' },
  '.cm-tooltip-autocomplete > ul > li[aria-selected]': { background: '#087f8c', color: '#fff' },
  '.cm-panels': { background: '#f0f7f6', color: '#243c40' },
  '.cm-search': { whiteSpace: 'normal' },
  '.cm-search input': { maxWidth: '145px' },
  '.cm-placeholder': { color: '#859a9d' },
})

export function TypstCodeEditor({ documentKey, sessions, value, label, placeholder, onChange }: Props) {
  const host = useRef<HTMLDivElement>(null)
  const editor = useRef<EditorView | null>(null)
  const latest = useRef({ value, onChange })
  const formatting = useRef(false)
  const [isFormatting, setIsFormatting] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => { latest.current = { value, onChange } }, [value, onChange])

  const runFormat = useCallback(async () => {
    const view = editor.current
    if (!view || formatting.current) return
    const original = view.state.doc
    formatting.current = true
    setIsFormatting(true)
    setMessage('')
    try {
      const formatted = await formatTypst(original.toString())
      if (editor.current !== view) return
      if (view.state.doc !== original) {
        setMessage('Text changed while formatting. Run Format again.')
        return
      }
      if (formatted !== original.toString()) {
        view.dispatch({
          changes: { from: 0, to: original.length, insert: formatted },
          selection: { anchor: Math.min(view.state.selection.main.head, formatted.length) },
          annotations: [Transaction.userEvent.of('input.format'), isolateHistory.of('full')],
        })
      }
      setMessage('Formatted.')
      view.focus()
    } catch {
      if (editor.current === view) setMessage('Could not format. Check for incomplete Typst syntax, then try again.')
    } finally {
      formatting.current = false
      if (editor.current === view) setIsFormatting(false)
    }
  }, [])

  useEffect(() => {
    if (!host.current) return
    const extensions = [
      basicSetup,
      typst_lezer(),
      // Typst uses double quotes for strings; apostrophes in prose should stay single.
      typstLanguageData.of({ closeBrackets: { brackets: ['(', '[', '{', '"'] } }),
      indentUnit.of('  '),
      EditorView.lineWrapping,
      theme,
      editorPlaceholder(placeholder),
      EditorView.contentAttributes.of({ 'aria-label': label, spellcheck: 'false' }),
      keymap.of([
        { key: 'Shift-Alt-f', run: () => { void runFormat(); return true } },
        indentWithTab,
      ]),
      EditorView.updateListener.of((update) => {
        if (update.docChanged && !update.transactions.every((transaction) => transaction.annotation(externalChange))) {
          latest.current.onChange(update.state.doc.toString())
          setMessage('')
        }
      }),
    ]
    const saved = sessions.get(documentKey)
    const state = saved && saved.state.doc.toString() === latest.current.value
      ? saved.state.update({ effects: StateEffect.reconfigure.of(extensions) }).state
      : EditorState.create({ doc: latest.current.value, extensions })
    const view = new EditorView({ state, parent: host.current })
    editor.current = view
    if (saved) view.scrollDOM.scrollTop = saved.scrollTop
    return () => {
      sessions.set(documentKey, { state: view.state, scrollTop: view.scrollDOM.scrollTop })
      // Bound retained editor histories for documents with many annotations.
      if (sessions.size > 100) sessions.delete(sessions.keys().next().value!)
      editor.current = null
      view.destroy()
    }
  }, [documentKey, sessions, label, placeholder, runFormat])

  useEffect(() => {
    const view = editor.current
    if (!view || view.state.doc.toString() === value) return
    view.dispatch({
      changes: { from: 0, to: view.state.doc.length, insert: value },
      annotations: [externalChange.of(true), Transaction.addToHistory.of(false)],
    })
    setMessage('')
  }, [value])

  return (
    <div className="typst-code-editor">
      <div className="source-toolbar">
        <span className="source-label">{label}</span>
        <div>
          <button type="button" className="icon-button" aria-label="Find in source" title="Find / replace (Ctrl/Cmd+F)" onClick={() => { if (editor.current) openSearchPanel(editor.current) }}><Search size={14} /></button>
          <button type="button" className="format-button" disabled={isFormatting} onClick={() => void runFormat()} title="Format source (Shift+Alt+F)"><AlignLeft size={14} />{isFormatting ? 'Formatting…' : 'Format'}</button>
        </div>
      </div>
      <div className="source-editor" ref={host} />
      <div className="source-help" role="status">{message || 'Ctrl+Space suggestions · Esc then Tab to leave editor'}</div>
    </div>
  )
}
