import { createContext, useContext } from 'react'
import type { EditorThemePreference } from './editor-theme'

export type Theme = 'light' | 'dark'
export const THEME_KEY = 'typstability-theme'
export const ThemeContext = createContext<{
  theme: Theme
  toggleTheme: () => void
  editorTheme: EditorThemePreference
  setEditorTheme: (theme: EditorThemePreference) => void
}>({ theme: 'light', toggleTheme: () => {}, editorTheme: 'auto', setEditorTheme: () => {} })
export const useTheme = () => useContext(ThemeContext)

export function readThemePreference(): Theme | null {
  try {
    const value = localStorage.getItem(THEME_KEY)
    return value === 'light' || value === 'dark' ? value : null
  } catch { return null }
}
