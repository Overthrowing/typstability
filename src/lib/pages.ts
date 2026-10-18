import type { EditorPage } from '../types'

export type DropSide = 'before' | 'after'

export function reorderPages(pages: EditorPage[], draggedId: string, targetId: string, side: DropSide) {
  const from = pages.findIndex((page) => page.id === draggedId)
  if (from < 0 || draggedId === targetId || !pages.some((page) => page.id === targetId)) return pages

  const reordered = [...pages]
  const [dragged] = reordered.splice(from, 1)
  const target = reordered.findIndex((page) => page.id === targetId)
  const at = target + (side === 'after' ? 1 : 0)
  if (at === from) return pages
  reordered.splice(at, 0, dragged)
  return reordered
}
