export const DEFAULT_TYPST_TOP_INSET = 4

export function wrapSource(
  source: string,
  prelude: string,
  width: number,
  height: number,
  topInset = DEFAULT_TYPST_TOP_INSET,
  pageFill = '',
) {
  // Keep a sliver of usable content when a box is resized very small.
  const inset = Math.min(Math.max(0, topInset), Math.max(0, height - Math.min(1, height / 2)))
  return `#set text(font: "New Computer Modern", size: 12pt)
#set page(fill: white)
${prelude}
#set page(width: ${width}pt, height: ${height}pt, margin: (left: 0pt, right: 0pt, top: ${inset}pt, bottom: 0pt))
${pageFill.trim() ? `#set page(fill: ${pageFill.trim()})` : ''}
#block(width: 100%, height: 100%, clip: true)[
${source}
]`
}
