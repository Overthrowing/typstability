import { act, renderHook, waitFor } from '@testing-library/react'
import { useState } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { EditorDocument } from '../types'
import { useProjects } from './use-projects'
import { loadProject, saveProject } from './storage'
import type { Project } from './storage'

const records = new Map<string, Project>()
vi.mock('./storage', () => ({
  listProjects: vi.fn(async () => [...records.values()].map((p) => ({ id: p.id, name: p.document.name, createdAt: p.createdAt, updatedAt: p.document.updatedAt, pageCount: p.document.pages.length }))),
  loadProject: vi.fn(async (id: string) => structuredClone(records.get(id))),
  saveProject: vi.fn(async (p: Project) => { records.set(p.id, structuredClone(p)); return p.id }),
  deleteProject: vi.fn(async (id: string) => { records.delete(id) }),
}))
const doc = (name: string): EditorDocument => ({ name, prelude: '', originalPdf: null, pages: [{ id: name, sourceIndex: null, width: 612, height: 792, elements: [] }], updatedAt: 1 })
function useHarness() {
  const [document, setDocument] = useState(doc('Empty'))
  const library = useProjects(document, setDocument)
  return { document, setDocument, library }
}
beforeEach(() => { records.clear(); vi.clearAllMocks() })
describe('project lifecycle', () => {
  it('flushes edits when switching immediately, and reopening preserves both projects', async () => {
    const { result } = renderHook(useHarness)
    await waitFor(() => expect(result.current.library.ready).toBe(true))
    await act(() => result.current.library.create(doc('First')))
    const firstId = result.current.library.activeId!
    act(() => result.current.setDocument({ ...result.current.document, prelude: '#let saved = 1' }))
    await act(() => result.current.library.create(doc('Second')))
    const secondId = result.current.library.activeId!
    expect(records.get(firstId)?.document.prelude).toBe('#let saved = 1')
    await act(() => result.current.library.open(firstId))
    expect(result.current.document.name).toBe('First')
    expect(records.get(secondId)?.document.name).toBe('Second')
    await act(() => result.current.library.duplicate(firstId))
    expect(records.size).toBe(3)
    await act(() => result.current.library.remove(firstId))
    expect(result.current.library.activeId).toBeUndefined()
    expect(records.size).toBe(2)
  })
  it('keeps unsaved work open when a save fails and prevents switching', async () => {
    const { result } = renderHook(useHarness)
    await waitFor(() => expect(result.current.library.ready).toBe(true))
    await act(() => result.current.library.create(doc('First')))
    act(() => result.current.setDocument({ ...result.current.document, name: 'Unsaved edits' }))
    vi.mocked(saveProject).mockRejectedValueOnce(new DOMException('Storage full', 'QuotaExceededError'))
    await act(() => result.current.library.open('other'))
    expect(result.current.document.name).toBe('Unsaved edits')
    expect(result.current.library.error).toContain('Storage full')
    expect(loadProject).not.toHaveBeenCalled()
  })
  it('leaves a new document exportable if storage is unavailable', async () => {
    const { result } = renderHook(useHarness)
    await waitFor(() => expect(result.current.library.ready).toBe(true))
    vi.mocked(saveProject).mockRejectedValueOnce(new Error('Storage unavailable'))
    await act(() => result.current.library.create(doc('Backup me')))
    expect(result.current.document.name).toBe('Backup me')
    expect(result.current.library.libraryOpen).toBe(false)
    expect(result.current.library.error).toContain('Storage unavailable')
  })
})
