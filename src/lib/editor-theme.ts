export const EDITOR_THEME_KEY = 'typstability-editor-theme'
export const editorThemeOptions = [
  { id: 'auto', label: 'GitHub · follow site' },
  { id: 'github-light', label: 'GitHub Light' },
  { id: 'github-dark', label: 'GitHub Dark' },
  { id: 'catppuccin-latte', label: 'Catppuccin Latte' },
  { id: 'catppuccin-frappe', label: 'Catppuccin Frappé' },
  { id: 'catppuccin-macchiato', label: 'Catppuccin Macchiato' },
  { id: 'catppuccin-mocha', label: 'Catppuccin Mocha' },
  { id: 'monokai-light', label: 'Monokai Light' },
  { id: 'monokai-dark', label: 'Monokai Dark' },
] as const
export type EditorThemePreference = typeof editorThemeOptions[number]['id']
export type EditorThemeId = Exclude<EditorThemePreference, 'auto'>

export function readEditorThemePreference(): EditorThemePreference {
  try {
    const saved = localStorage.getItem(EDITOR_THEME_KEY)
    return editorThemeOptions.find(({ id }) => id === saved)?.id ?? 'auto'
  } catch { return 'auto' }
}

export function resolveEditorTheme(preference: EditorThemePreference, appearance: 'light' | 'dark'): EditorThemeId {
  return preference === 'auto' ? `github-${appearance}` : preference
}
