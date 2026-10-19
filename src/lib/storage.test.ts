import { describe, expect, it } from 'vitest'
import { normalizeDocument } from './storage'
import type { EditorDocument } from '../types'

describe('normalizeDocument', () => {
  it('adds an empty prelude to sessions saved by older versions', () => {
    const legacy = {
      name: 'Legacy',
      originalPdf: null,
      pages: [],
      updatedAt: 1,
    } as unknown as EditorDocument

    expect(normalizeDocument(legacy).prelude).toBe('')
  })

  it('preserves an existing prelude', () => {
    const document: EditorDocument = {
      name: 'Current',
      prelude: '#let shared = 1',
      originalPdf: null,
      pages: [],
      updatedAt: 1,
    }

    expect(normalizeDocument(document).prelude).toBe('#let shared = 1')
  })
})

import 'fake-indexeddb/auto'
import { beforeEach } from 'vitest'
import { deleteProject, listProjects, loadProject, saveProject } from './storage'

const doc = (name: string): EditorDocument => ({ name, prelude: '', originalPdf: new Uint8Array([0, 128, 255]), pages: [{ id: 'page', sourceIndex: 0, width: 612, height: 792, elements: [] }], updatedAt: 10 })
beforeEach(async () => {
  await new Promise<void>((resolve, reject) => {
    const request = indexedDB.deleteDatabase('typstability')
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
})
describe('project storage', () => {
  it('keeps projects and binary assets independent and deletes only the selected project', async () => {
    await saveProject({ id: 'one', createdAt: 1, document: doc('First') })
    await saveProject({ id: 'two', createdAt: 2, document: doc('Second') })
    await saveProject({ id: 'one', createdAt: 1, document: { ...doc('Renamed'), updatedAt: 20 } })
    expect((await listProjects()).map((p) => p.name)).toEqual(['Renamed', 'Second'])
    expect(Array.from((await loadProject('two'))!.document.originalPdf!)).toEqual([0, 128, 255])
    await deleteProject('one')
    expect(await loadProject('one')).toBeUndefined()
    expect((await loadProject('two'))?.document.name).toBe('Second')
  })
  it('migrates a legacy session exactly once and retains the original backup', async () => {
    const legacy = { ...doc('Legacy'), prelude: undefined }
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.open('typstability', 1)
      request.onupgradeneeded = () => request.result.createObjectStore('sessions')
      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        const db = request.result
        const tx = db.transaction('sessions', 'readwrite')
        tx.objectStore('sessions').put(legacy, 'active-document')
        tx.oncomplete = () => { db.close(); resolve() }
      }
    })
    const projects = await listProjects()
    expect(projects).toHaveLength(1)
    expect((await loadProject(projects[0].id))?.document.prelude).toBe('')
    await deleteProject(projects[0].id)
    expect(await listProjects()).toHaveLength(0)
  })
})
