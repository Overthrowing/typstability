import type { EditorDocument } from '../types'

export type Project = { id: string; createdAt: number; document: EditorDocument }
export type ProjectSummary = { id: string; name: string; createdAt: number; updatedAt: number; pageCount: number }
const DB_NAME = 'typstability'

export function normalizeDocument(document: EditorDocument): EditorDocument {
  return { ...document, prelude: document.prelude ?? '' }
}

function openDatabase() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 2)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains('sessions')) db.createObjectStore('sessions')
      if (!db.objectStoreNames.contains('projects')) {
        const projects = db.createObjectStore('projects', { keyPath: 'id' })
        const legacy = request.transaction!.objectStore('sessions').get('active-document')
        legacy.onsuccess = () => {
          if (legacy.result?.pages?.length) {
            projects.put({ id: crypto.randomUUID(), createdAt: legacy.result.updatedAt ?? Date.now(), document: normalizeDocument(legacy.result) })
          }
        }
      }
    }
    request.onsuccess = () => {
      request.result.onversionchange = () => request.result.close()
      resolve(request.result)
    }
    request.onerror = () => reject(request.error)
    request.onblocked = () => reject(new Error('Close other Typstability tabs, then reload to upgrade project storage.'))
  })
}

async function transaction<T>(mode: IDBTransactionMode, operation: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDatabase()
  try {
    return await new Promise<T>((resolve, reject) => {
      const tx = db.transaction('projects', mode)
      const request = operation(tx.objectStore('projects'))
      tx.oncomplete = () => resolve(request.result)
      tx.onerror = () => reject(tx.error ?? request.error)
      tx.onabort = () => reject(tx.error ?? new Error('Project save was interrupted.'))
    })
  } finally { db.close() }
}

export function saveProject(project: Project) {
  return transaction('readwrite', (store) => store.put(project))
}
export function loadProject(id: string): Promise<Project | undefined> {
  return transaction('readonly', (store) => store.get(id))
}
export function deleteProject(id: string) {
  return transaction('readwrite', (store) => store.delete(id))
}
export async function listProjects(): Promise<ProjectSummary[]> {
  // Cursor values are released individually, so listing does not retain all PDF assets.
  const db = await openDatabase()
  try {
    return await new Promise((resolve, reject) => {
      const result: ProjectSummary[] = []
      const tx = db.transaction('projects')
      const request = tx.objectStore('projects').openCursor()
      request.onsuccess = () => {
        const cursor = request.result
        if (!cursor) return
        const p = cursor.value as Project
        result.push({ id: p.id, name: p.document.name, createdAt: p.createdAt, updatedAt: p.document.updatedAt, pageCount: p.document.pages.length })
        cursor.continue()
      }
      tx.oncomplete = () => resolve(result.sort((a, b) => b.updatedAt - a.updatedAt))
      tx.onerror = () => reject(tx.error)
      tx.onabort = () => reject(tx.error)
    })
  } finally { db.close() }
}
