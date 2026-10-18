import { describe, expect, it } from 'vitest'
import { reorderPages } from './pages'
import type { EditorPage } from '../types'

const pages: EditorPage[] = ['a', 'b', 'c'].map((id, sourceIndex) => ({
  id, sourceIndex, width: 612, height: 792, elements: [],
}))

describe('page reordering', () => {
  it('moves a page before or after another without changing its source', () => {
    const firstToLast = reorderPages(pages, 'a', 'c', 'after')
    expect(firstToLast.map((page) => page.id)).toEqual(['b', 'c', 'a'])
    expect(firstToLast[2].sourceIndex).toBe(0)
    expect(reorderPages(pages, 'c', 'a', 'before').map((page) => page.id)).toEqual(['c', 'a', 'b'])
  })

  it('ignores drops that do not change the order', () => {
    expect(reorderPages(pages, 'a', 'b', 'before')).toBe(pages)
    expect(reorderPages(pages, 'a', 'a', 'after')).toBe(pages)
    expect(reorderPages(pages, 'missing', 'b', 'after')).toBe(pages)
  })
})
