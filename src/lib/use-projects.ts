import { useCallback, useEffect, useRef, useState } from 'react'
import type { EditorDocument } from '../types'
import { deleteProject, listProjects, loadProject, saveProject, type Project, type ProjectSummary } from './storage'

export function useProjects(document: EditorDocument, onLoad: (document: EditorDocument) => void) {
  const [projects, setProjects] = useState<ProjectSummary[]>([])
  const [active, setActive] = useState<{ id: string; createdAt: number } | null>(null)
  const [ready, setReady] = useState(false)
  const [busy, setBusy] = useState(false)
  const [libraryOpen, setLibraryOpen] = useState(true)
  const [status, setStatus] = useState('Saved')
  const [error, setError] = useState<string | null>(null)
  const queue = useRef<Promise<unknown>>(Promise.resolve())
  const latest = useRef(document)
  const saved = useRef<EditorDocument | null>(null)
  const locked = useRef(false)
  const activeRef = useRef(active)
  useEffect(() => { latest.current = document; activeRef.current = active }, [document, active])
  const refresh = useCallback(async () => setProjects(await listProjects()), [])
  useEffect(() => {
    void refresh().catch((e) => setError(`Could not load projects: ${String(e)}`)).finally(() => setReady(true))
  }, [refresh])
  const persist = useCallback((project: Project) => {
    setStatus('Saving…')
    const pending = queue.current.catch(() => undefined).then(() => saveProject(project))
    queue.current = pending
    return pending.then(() => {
      if (activeRef.current?.id === project.id && latest.current === project.document) {
        saved.current = project.document
        setStatus('Saved')
      }
    }).catch((e) => {
      setStatus('Save failed')
      setError(`Could not save project. Your edits are still open; export a project backup before leaving. ${String(e)}`)
      throw e
    })
  }, [])
  const flush = useCallback(async () => {
    if (active && saved.current !== document) await persist({ ...active, document })
    else await queue.current.catch(() => undefined)
  }, [active, document, persist])
  useEffect(() => {
    if (!ready || !active || busy || saved.current === document) return
    setStatus('Saving…')
    const timer = window.setTimeout(() => { void persist({ ...active, document }).catch(() => undefined) }, 500)
    return () => window.clearTimeout(timer)
  }, [active, busy, document, ready, persist])
  useEffect(() => {
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (active && saved.current !== document) { event.preventDefault(); event.returnValue = '' }
    }
    const onHidden = () => { if (globalThis.document.visibilityState === 'hidden') void flush().catch(() => undefined) }
    window.addEventListener('beforeunload', beforeUnload)
    globalThis.document.addEventListener('visibilitychange', onHidden)
    return () => { window.removeEventListener('beforeunload', beforeUnload); globalThis.document.removeEventListener('visibilitychange', onHidden) }
  }, [active, document, flush])
  const run = async (operation: () => Promise<void>) => {
    if (locked.current) return
    locked.current = true
    setBusy(true)
    try { await operation() } catch (e) { setError(e instanceof Error ? e.message : String(e)) }
    finally { locked.current = false; setBusy(false) }
  }
  const activate = (project: Project) => {
    saved.current = project.document
    activeRef.current = { id: project.id, createdAt: project.createdAt }
    setActive(activeRef.current)
    onLoad(project.document)
    setStatus('Saved')
    setLibraryOpen(false)
  }
  return {
    projects, activeId: active?.id, ready, busy, libraryOpen, status, error, clearError: () => setError(null),
    showLibrary: () => run(async () => { await flush(); await refresh(); setLibraryOpen(true) }),
    closeLibrary: () => setLibraryOpen(false),
    create: (next: EditorDocument) => run(async () => {
      await flush()
      const project = { id: crypto.randomUUID(), createdAt: Date.now(), document: next }
      // Keep the new document open even if browser storage is unavailable, so it can be exported.
      activate(project)
      saved.current = null
      await persist(project)
      await refresh()
    }),
    open: (id: string) => run(async () => {
      await flush()
      const project = await loadProject(id)
      if (!project) throw new Error('That project no longer exists.')
      activate(project)
    }),
    rename: (id: string, name: string) => run(async () => {
      await flush()
      const project = await loadProject(id)
      if (!project) throw new Error('That project no longer exists.')
      project.document = { ...project.document, name: name.trim() || 'Untitled', updatedAt: Date.now() }
      await persist(project)
      if (id === active?.id) { saved.current = project.document; onLoad(project.document) }
      await refresh()
    }),
    duplicate: (id: string) => run(async () => {
      await flush()
      const project = await loadProject(id)
      if (!project) throw new Error('That project no longer exists.')
      await persist({ ...project, id: crypto.randomUUID(), createdAt: Date.now(), document: { ...project.document, name: `${project.document.name} (copy)`, updatedAt: Date.now() } })
      await refresh()
      setStatus('Saved')
    }),
    remove: (id: string) => run(async () => {
      await flush()
      await deleteProject(id)
      if (id === active?.id) { setActive(null); onLoad({ name: 'Untitled', prelude: '', originalPdf: null, pages: [], updatedAt: Date.now() }) }
      await refresh()
    }),
  }
}
