import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { EditorView } from '@codemirror/view'
import { undo } from '@codemirror/commands'
import { insertBracket } from '@codemirror/autocomplete'
import { TypstCodeEditor, type EditorSessions } from './TypstCodeEditor'
import { ThemeProvider } from './ThemeProvider'
import { ThemeToggle } from './ThemeToggle'
import { EDITOR_THEME_KEY } from '../lib/editor-theme'
import { formatTypst } from '../typst/formatter'

vi.mock('../typst/formatter', () => ({ formatTypst: vi.fn() }))
beforeAll(() => {
  Range.prototype.getClientRects = () => [] as unknown as DOMRectList
  Range.prototype.getBoundingClientRect = () => new DOMRect()
})
afterEach(() => { cleanup(); localStorage.clear(); vi.resetAllMocks() })

function mount(value = '', sessions: EditorSessions = new Map(), documentKey = 'box-a') {
  const onChange = vi.fn()
  const props = { value, sessions, documentKey, onChange, label: 'Typst source', placeholder: 'Write Typst' }
  const result = render(<TypstCodeEditor {...props} />)
  const view = EditorView.findFromDOM(result.container.querySelector('.cm-editor')!)!
  return { ...result, view, onChange, props }
}

describe('Typst code editor', () => {
  it('follows site appearance by default and retains an explicit theme, cursor and undo history', () => {
    const props = { value: 'Hello', sessions: new Map(), documentKey: 'theme-test', onChange: vi.fn(), label: 'Typst source', placeholder: 'Write Typst' }
    const tree = <ThemeProvider><ThemeToggle /><TypstCodeEditor {...props} /></ThemeProvider>
    const first = render(tree)
    const view = EditorView.findFromDOM(first.container.querySelector('.cm-editor')!)!
    const initiallyDark = view.state.facet(EditorView.darkTheme)
    expect(screen.getByRole('combobox', { name: 'Editor theme' })).toHaveValue('auto')
    fireEvent.click(screen.getByRole('button', { name: /Switch to .* mode/ }))
    expect(view.state.facet(EditorView.darkTheme)).toBe(!initiallyDark)
    act(() => view.dispatch({ changes: { from: 5, insert: '!' }, selection: { anchor: 6 } }))
    for (const [theme, dark] of [['github-light', false], ['github-dark', true], ['catppuccin-latte', false], ['catppuccin-frappe', true], ['catppuccin-macchiato', true], ['catppuccin-mocha', true], ['monokai-light', false], ['monokai-dark', true]] as const) {
      fireEvent.change(screen.getByRole('combobox', { name: 'Editor theme' }), { target: { value: theme } })
      expect(view.state.facet(EditorView.darkTheme)).toBe(dark)
      expect(view.state.doc.toString()).toBe('Hello!')
      expect(view.state.selection.main.head).toBe(6)
    }
    expect(props.onChange).toHaveBeenCalledTimes(1)
    fireEvent.click(screen.getByRole('button', { name: /Switch to .* mode/ }))
    expect(view.state.facet(EditorView.darkTheme)).toBe(true)
    act(() => { undo(view) })
    expect(view.state.doc.toString()).toBe('Hello')
    expect(localStorage.getItem(EDITOR_THEME_KEY)).toBe('monokai-dark')
    first.unmount()
    render(tree)
    expect(screen.getByRole('combobox', { name: 'Editor theme' })).toHaveValue('monokai-dark')
  })

  it('falls back to GitHub following the site for an unknown saved theme', () => {
    localStorage.setItem(EDITOR_THEME_KEY, 'retired-theme')
    const props = { value: '', sessions: new Map(), documentKey: 'fallback', onChange: vi.fn(), label: 'Source', placeholder: '' }
    render(<ThemeProvider><TypstCodeEditor {...props} /></ThemeProvider>)
    expect(screen.getByRole('combobox', { name: 'Editor theme' })).toHaveValue('auto')
  })

  it('pairs parentheses without pairing apostrophes in prose', () => {
    const { view } = mount('#text')
    act(() => {
      view.dispatch({ selection: { anchor: 5 } })
      view.dispatch(insertBracket(view.state, '(')!)
    })
    expect(view.state.doc.toString()).toBe('#text()')
    expect(view.state.selection.main.head).toBe(6)
    const prose = mount('It')
    act(() => prose.view.dispatch({ selection: { anchor: 2 } }))
    expect(insertBracket(prose.view.state, "'")).toBeNull()
  })

  it('keeps cursor and undo history separate when switching boxes', () => {
    const sessions: EditorSessions = new Map()
    const a = mount('One', sessions)
    act(() => a.view.dispatch({ changes: { from: 3, insert: '!' }, selection: { anchor: 4 } }))
    a.unmount()
    const b = mount('Two', sessions, 'box-b')
    expect(b.view.state.doc.toString()).toBe('Two')
    b.unmount()
    const restored = mount('One!', sessions)
    expect(restored.view.state.selection.main.head).toBe(4)
    act(() => { undo(restored.view) })
    expect(restored.view.state.doc.toString()).toBe('One')
    expect(restored.onChange).toHaveBeenLastCalledWith('One')
  })

  it('accepts external source changes without echoing them back', () => {
    const editor = mount('Old')
    editor.rerender(<TypstCodeEditor {...editor.props} value="New" />)
    expect(editor.view.state.doc.toString()).toBe('New')
    expect(editor.onChange).not.toHaveBeenCalled()
  })

  it('makes formatting a single undoable change', async () => {
    vi.mocked(formatTypst).mockResolvedValue('#let x = 1\n')
    const editor = mount('#let x=1')
    fireEvent.click(screen.getByRole('button', { name: 'Format' }))
    await waitFor(() => expect(editor.view.state.doc.toString()).toBe('#let x = 1\n'))
    act(() => { undo(editor.view) })
    expect(editor.view.state.doc.toString()).toBe('#let x=1')
  })

  it('does not overwrite edits made while the formatter is loading', async () => {
    let finish!: (value: string) => void
    vi.mocked(formatTypst).mockReturnValue(new Promise((resolve) => { finish = resolve }))
    const editor = mount('Hello')
    fireEvent.click(screen.getByRole('button', { name: 'Format' }))
    act(() => editor.view.dispatch({ changes: { from: 5, insert: ' world' } }))
    await act(async () => finish('Hello\n'))
    expect(editor.view.state.doc.toString()).toBe('Hello world')
    expect(screen.getByRole('status')).toHaveTextContent('Text changed while formatting')
  })

  it('preserves source if formatting fails', async () => {
    vi.mocked(formatTypst).mockRejectedValue(new Error('Parse error'))
    const editor = mount('#let x = (')
    fireEvent.click(screen.getByRole('button', { name: 'Format' }))
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Could not format'))
    expect(editor.view.state.doc.toString()).toBe('#let x = (')
    expect(editor.onChange).not.toHaveBeenCalled()
  })
})
