import { createContext, useContext } from 'react'

export type Theme = 'light' | 'dark'
export const THEME_KEY = 'typstability-theme'
export const ThemeContext = createContext<{ theme: Theme; toggleTheme: () => void }>({ theme: 'light', toggleTheme: () => {} })
export const useTheme = () => useContext(ThemeContext)

export function readThemePreference(): Theme | null {
  try {
    const value = localStorage.getItem(THEME_KEY)
    return value === 'light' || value === 'dark' ? value : null
  } catch { return null }
}
