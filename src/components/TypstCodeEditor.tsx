import { useCallback, useEffect, useRef, useState } from 'react'
import { AlignLeft, Search } from 'lucide-react'
import { basicSetup } from 'codemirror'
import { Annotation, Compartment, EditorState, StateEffect, Transaction } from '@codemirror/state'
import { EditorView, keymap, placeholder as editorPlaceholder } from '@codemirror/view'
import { indentWithTab, isolateHistory } from '@codemirror/commands'
import { HighlightStyle, indentUnit, syntaxHighlighting } from '@codemirror/language'
import { tags } from '@lezer/highlight'
import { monokai } from '@uiw/codemirror-theme-monokai'
import { openSearchPanel } from '@codemirror/search'
import { typst_lezer, typstLanguageData, typstTags, typstLezerIndentService, typstLezerListKeymap, typstLezerFoldService, typstLezerLinter } from 'codemirror-lang-typst/lezer'
import { formatTypst } from '../typst/formatter'
import { useTheme } from '../lib/theme'

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
const editorTheme = EditorView.theme({
  '&': { height: '100%', fontSize: '12px', color: 'var(--code-ink)', backgroundColor: 'var(--code-bg)' },
  '&.cm-focused': { outline: 'none' },
  '.cm-scroller': { overflow: 'auto', fontFamily: 'ui-monospace, SFMono-Regular, monospace', lineHeight: '1.75' },
  '.cm-content': { padding: '12px 0', caretColor: 'var(--code-caret)' },
  '.cm-line': { padding: '0 10px' },
  '.cm-gutters': { background: 'var(--code-gutter)', color: 'var(--subtle)', borderRight: '1px solid var(--line)' },
  '.cm-activeLine, .cm-activeLineGutter': { background: 'var(--code-active)' },
  '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, ::selection': { background: 'var(--code-selection)' },
  '&.cm-focused .cm-matchingBracket': { background: 'var(--code-match)', outline: '1px solid var(--accent-border)' },
  '.cm-cursor, .cm-dropCursor': { borderLeftColor: 'var(--code-caret)' },
  '.cm-tooltip': { border: '1px solid var(--line-strong)', borderRadius: '6px', background: 'var(--surface)', color: 'var(--ink)' },
  '.cm-tooltip-autocomplete > ul > li[aria-selected]': { background: 'var(--accent)', color: 'var(--on-accent)' },
  '.cm-panels': { background: 'var(--chrome)', color: 'var(--ink)' },
  '.cm-search': { whiteSpace: 'normal' },
  '.cm-search input': { maxWidth: '145px' },
  '.cm-placeholder': { color: 'var(--subtle)' },
})

const syntaxColors = syntaxHighlighting(HighlightStyle.define([
  { tag: [tags.keyword, tags.null, tags.atom], class: 'tok-keyword' },
  { tag: tags.function(tags.variableName), class: 'tok-function' },
  { tag: [tags.number, tags.bool], class: 'tok-number' },
  { tag: [tags.string, tags.monospace], class: 'tok-string' },
  { tag: tags.comment, class: 'tok-comment' },
  { tag: [typstTags.interpolated, typstTags.mathDelimiter, typstTags.listMarker, tags.link, tags.url, tags.escape, tags.labelName], class: 'tok-meta' },
  { tag: tags.invalid, class: 'tok-invalid' },
  { tag: tags.heading, class: 'tok-heading' },
  { tag: tags.strong, class: 'tok-strong' },
  { tag: tags.emphasis, class: 'tok-emphasis' },
  { tag: [tags.punctuation, tags.operator], class: 'tok-punctuation' },
  { tag: [tags.variableName, tags.propertyName], class: 'tok-variable' },
]))

// Keep the language's parser and editing services, while letting the selected
// editor theme own highlighting instead of stacking its fixed light palette.
const typstLanguage = typst_lezer().language
const monokaiTypst = [monokai, syntaxHighlighting(HighlightStyle.define([
  { tag: typstTags.mathDelimiter, color: '#E6DB74' },
  { tag: typstTags.listMarker, color: '#F92672' },
  { tag: typstTags.interpolated, color: '#66D9EF' },
]))]
const lightTheme = [EditorView.theme({}, { dark: false }), syntaxColors]

export function TypstCodeEditor({ documentKey, sessions, value, label, placeholder, onChange }: Props) {
  const { theme } = useTheme()
  const [colorScheme] = useState(() => new Compartment())
  const host = useRef<HTMLDivElement>(null)
  const editor = useRef<EditorView | null>(null)
  const latest = useRef({ value, onChange, theme })
  const formatting = useRef(false)
  const [isFormatting, setIsFormatting] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => { latest.current = { value, onChange, theme } }, [value, onChange, theme])

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
      typstLanguage,
      typstLezerIndentService,
      typstLezerListKeymap,
      typstLezerFoldService,
      typstLezerLinter,
      // Typst uses double quotes for strings; apostrophes in prose should stay single.
      typstLanguageData.of({ closeBrackets: { brackets: ['(', '[', '{', '"'] } }),
      indentUnit.of('  '),
      EditorView.lineWrapping,
      editorTheme,
      colorScheme.of(latest.current.theme === 'dark' ? monokaiTypst : lightTheme),
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
  }, [documentKey, sessions, label, placeholder, runFormat, colorScheme])

  useEffect(() => {
    editor.current?.dispatch({ effects: colorScheme.reconfigure(theme === 'dark' ? monokaiTypst : lightTheme) })
  }, [theme, colorScheme])

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
