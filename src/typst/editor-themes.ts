import type { Extension } from '@codemirror/state'
import { EditorView } from '@codemirror/view'
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language'
import { tags } from '@lezer/highlight'
import { typstTags } from 'codemirror-lang-typst/lezer'
import { githubLightInit, githubDarkInit } from '@uiw/codemirror-theme-github'
import { monokai } from '@uiw/codemirror-theme-monokai'
import { createTheme } from '@uiw/codemirror-themes'
import { catppuccinLatte, catppuccinFrappe, catppuccinMacchiato, catppuccinMocha } from '@catppuccin/codemirror'
import type { EditorThemeId } from '../lib/editor-theme'

// These tags are specific to Typst, so general CodeMirror themes do not cover them.
function typstAccents(math: string, marker: string, interpolation: string) {
  return syntaxHighlighting(HighlightStyle.define([
    { tag: typstTags.mathDelimiter, color: math },
    { tag: typstTags.listMarker, color: marker },
    { tag: typstTags.interpolated, color: interpolation },
  ]))
}

// Classic Monokai is dark-only. This local light adaptation preserves its
// pink/teal/violet families with darker foregrounds for a light background.
const monokaiLight = createTheme({
  theme: 'light',
  settings: {
    background: '#fafaf7', foreground: '#383830', caret: '#383830',
    gutterBackground: '#fafaf7', gutterForeground: '#747468', gutterBorder: '#e0e0d8',
    selection: '#dcd9ef', selectionMatch: '#e9e5f2', lineHighlight: '#efefe7',
  },
  styles: [
    { tag: [tags.keyword, tags.operator, tags.operatorKeyword], color: '#b61957' },
    { tag: [tags.name, tags.propertyName, tags.bool, tags.atom], color: '#9b5200' },
    { tag: [tags.function(tags.variableName), tags.labelName], color: '#006d80' },
    { tag: [tags.string, tags.monospace], color: '#766600' },
    { tag: [tags.number, tags.constant(tags.name)], color: '#7440a6' },
    { tag: [tags.typeName, tags.className, tags.heading], color: '#467000' },
    { tag: [tags.comment, tags.meta], color: '#737367', fontStyle: 'italic' },
    { tag: [tags.url, tags.escape, tags.link], color: '#006d80' },
    { tag: tags.strong, fontWeight: 'bold' },
    { tag: tags.emphasis, fontStyle: 'italic' },
    { tag: tags.link, textDecoration: 'underline' },
    { tag: tags.invalid, color: '#b52222' },
  ],
})

const themes: Record<EditorThemeId, Extension> = {
  'github-light': [githubLightInit({ settings: { caret: '#24292e', lineHighlight: '#f6f8fa' } }), typstAccents('#032f62', '#d73a49', '#6f42c1')],
  'github-dark': [githubDarkInit({ settings: { gutterBackground: '#0d1117', gutterForeground: '#8b949e', gutterBorder: '#30363d', lineHighlight: '#161b22' } }), typstAccents('#a5d6ff', '#ff7b72', '#d2a8ff')],
  'catppuccin-latte': [catppuccinLatte, typstAccents('#40a02b', '#8839ef', '#1e66f5')],
  'catppuccin-frappe': [catppuccinFrappe, typstAccents('#a6d189', '#ca9ee6', '#8caaee')],
  'catppuccin-macchiato': [catppuccinMacchiato, typstAccents('#a6da95', '#c6a0f6', '#8aadf4')],
  'catppuccin-mocha': [catppuccinMocha, typstAccents('#a6e3a1', '#cba6f7', '#89b4fa')],
  'monokai-light': [monokaiLight, typstAccents('#766600', '#b61957', '#006d80')],
  'monokai-dark': [monokai, typstAccents('#E6DB74', '#F92672', '#66D9EF')],
}

export function editorColorScheme(id: EditorThemeId): Extension {
  const dark = !['github-light', 'catppuccin-latte', 'monokai-light'].includes(id)
  return [themes[id], EditorView.theme({ '&': { colorScheme: dark ? 'dark' : 'light' } }, { dark })]
}
