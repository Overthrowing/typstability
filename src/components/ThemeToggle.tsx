import { Moon, Sun } from 'lucide-react'
import { useTheme } from '../lib/theme'

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()
  const label = `Switch to ${theme === 'light' ? 'dark' : 'light'} mode`
  return <button className="theme-toggle" type="button" onClick={toggleTheme} aria-label={label} title={label}>
    {theme === 'light' ? <Moon size={17} /> : <Sun size={17} />}
  </button>
}
