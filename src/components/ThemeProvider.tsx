import { useEffect, useState, type ReactNode } from 'react'
import { readThemePreference, THEME_KEY, ThemeContext, type Theme } from '../lib/theme'

import { EDITOR_THEME_KEY, readEditorThemePreference, type EditorThemePreference } from '../lib/editor-theme'

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreference] = useState(readThemePreference)
  const [systemTheme, setSystemTheme] = useState<Theme>(() => window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
  const theme = preference ?? systemTheme
  const [editorTheme, setEditorPreference] = useState(readEditorThemePreference)

  useEffect(() => {
    const media = window.matchMedia?.('(prefers-color-scheme: dark)')
    if (!media) return
    const update = () => setSystemTheme(media.matches ? 'dark' : 'light')
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#181818' : '#087f8c')
  }, [theme])

  const toggleTheme = () => {
    const next = theme === 'light' ? 'dark' : 'light'
    setPreference(next)
    try { localStorage.setItem(THEME_KEY, next) } catch { /* The toggle still works without storage. */ }
  }

  const setEditorTheme = (next: EditorThemePreference) => {
    setEditorPreference(next)
    try { localStorage.setItem(EDITOR_THEME_KEY, next) } catch { /* Keep the choice for this session. */ }
  }

  return <ThemeContext.Provider value={{ theme, toggleTheme, editorTheme, setEditorTheme }}>{children}</ThemeContext.Provider>
}
