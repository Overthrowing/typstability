import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { DragEvent as ReactDragEvent } from 'react'
import { FileUp, PanelLeftClose, PanelLeftOpen, Plus, RotateCcw, ShieldCheck, Trash2 } from 'lucide-react'
import type { PDFDocumentProxy } from 'pdfjs-dist'
import { CanvasPage } from './components/CanvasPage'
import { PageThumbnail } from './components/PageThumbnail'
import { PreludeInspector } from './components/PreludeInspector'
import { Toolbar } from './components/Toolbar'
import { TypstInspector } from './components/TypstInspector'
import { useHistoryState } from './lib/history'
import { decodeImageFile, isSupportedImageFile, placeImage } from './lib/images'
import { createPdfProxy, downloadBytes, exportPdf, readPdf } from './lib/pdf'
import { loadSession, saveSession } from './lib/storage'
import { compileTypstSvg } from './typst/client'
import { DEFAULT_TYPST_TOP_INSET } from './typst/source'
import { strokeTouchesPoint } from './lib/geometry'
import { reorderPages } from './lib/pages'
import type { DropSide } from './lib/pages'
import type {
  Box,
  EditorDocument,
  ImageElement,
  ObjectDrop,
  ObjectDragPreview,
  PageElement,
  Point,
  Selection,
  Tool,
  TypstElement,
} from './types'
import { LETTER_PAGE, uid } from './types'

const emptyDocument = (): EditorDocument => ({
  name: 'Untitled',
  prelude: '',
  originalPdf: null,
  pages: [],
  updatedAt: Date.now(),
})

function thumbnailDropSide(event: ReactDragEvent<HTMLButtonElement>): DropSide {
  const bounds = event.currentTarget.getBoundingClientRect()
  return event.clientY < bounds.top + bounds.height / 2 ? 'before' : 'after'
}

function App() {
  const documentHistory = useHistoryState(emptyDocument())
  const document = documentHistory.value
  const setDocumentState = documentHistory.set
  const resetDocumentState = documentHistory.reset
  const [pdfProxy, setPdfProxy] = useState<PDFDocumentProxy | null>(null)
  const [selection, setSelection] = useState<Selection>(null)
  const [activePageId, setActivePageId] = useState<string | null>(null)
  const [tool, setTool] = useState<Tool>('select')
  const [zoom, setZoom] = useState(0.9)
  const [penColor, setPenColor] = useState('#1f2328')
  const [penRadius, setPenRadius] = useState(2)
  const [eraserRadius, setEraserRadius] = useState(12)
  const [dragPreview, setDragPreview] = useState<ObjectDragPreview | null>(null)
  const [thumbnailsOpen, setThumbnailsOpen] = useState(true)
  const [draggingPageId, setDraggingPageId] = useState<string | null>(null)
  const [pageDropTarget, setPageDropTarget] = useState<{ pageId: string; side: DropSide } | null>(null)
  const [imageDropTarget, setImageDropTarget] = useState<string | null>(null)
  const [imageDragActive, setImageDragActive] = useState(false)
  const [preludeOpen, setPreludeOpen] = useState(false)
  const [preludeError, setPreludeError] = useState<string | undefined>()
  const [finalCompileRevision, setFinalCompileRevision] = useState(0)
  const [exporting, setExporting] = useState(false)
  const [recoverable, setRecoverable] = useState<EditorDocument | null>(null)
  const [storageReady, setStorageReady] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [confirmNewOpen, setConfirmNewOpen] = useState(false)
  const openInputRef = useRef<HTMLInputElement>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)
  const compileBurstStartRef = useRef<number | null>(null)
  const handledFinalCompileRef = useRef(0)
  const backgroundPreviewRequests = useRef(new Map<string, string>())
  const draggingPageIdRef = useRef<string | null>(null)
  const documentEpochRef = useRef(0)

  const activePage = document.pages.find((page) => page.id === activePageId) ?? document.pages[0]
  const selectedElement = useMemo(() => {
    if (!selection) return null
    return document.pages
      .find((page) => page.id === selection.pageId)
      ?.elements.find((element) => element.id === selection.elementId) ?? null
  }, [document.pages, selection])

  const selectedTypst = selectedElement?.kind === 'typst' ? selectedElement : null
  const selectedTypstId = selectedTypst?.id
  const selectedTypstSource = selectedTypst?.source
  const selectedTypstWidth = selectedTypst?.width
  const selectedTypstHeight = selectedTypst?.height
  const selectedTypstTopInset = selectedTypst?.topInset ?? DEFAULT_TYPST_TOP_INSET
  const selectedTypstPageFill = selectedTypst?.pageFill ?? ''
  const selectedPageId = selection?.pageId

  useEffect(() => {
    loadSession()
      .then((session) => setRecoverable(session ?? null))
      .catch(() => undefined)
      .finally(() => setStorageReady(true))
  }, [])

  useEffect(() => {
    if (!storageReady || !document.pages.length) return
    const timer = window.setTimeout(() => {
      void saveSession({ ...document, updatedAt: Date.now() })
    }, 800)
    return () => window.clearTimeout(timer)
  }, [document, storageReady])

  useEffect(() => {
    if (!document.originalPdf) {
      setPdfProxy(null)
      return
    }
    let cancelled = false
    createPdfProxy(document.originalPdf).then((proxy) => {
      if (!cancelled) setPdfProxy(proxy)
    }).catch((error) => setNotice(error instanceof Error ? error.message : String(error)))
    return () => { cancelled = true }
  }, [document.originalPdf])

  const updateDocument = useCallback((updater: (current: EditorDocument) => EditorDocument, record = true) => {
    setDocumentState((current) => ({ ...updater(current), updatedAt: Date.now() }), record)
  }, [setDocumentState])

  const updateElement = useCallback((pageId: string, next: PageElement, record = true) => {
    updateDocument((current) => ({
      ...current,
      pages: current.pages.map((page) => page.id === pageId
        ? { ...page, elements: page.elements.map((element) => element.id === next.id ? next : element) }
        : page),
    }), record)
  }, [updateDocument])

  useEffect(() => {
    if (!selectedTypstId || selectedTypstSource === undefined || selectedTypstWidth === undefined || selectedTypstHeight === undefined || !selectedPageId) return
    const id = selectedTypstId
    const pageId = selectedPageId
    const source = selectedTypstSource
    const width = selectedTypstWidth
    const height = selectedTypstHeight
    const topInset = selectedTypstTopInset
    const pageFill = selectedTypstPageFill
    const prelude = document.prelude
    const forceFinal = handledFinalCompileRef.current !== finalCompileRevision
    handledFinalCompileRef.current = finalCompileRevision
    const now = performance.now()
    if (forceFinal) compileBurstStartRef.current = null
    else if (compileBurstStartRef.current === null) compileBurstStartRef.current = now
    const elapsed = compileBurstStartRef.current === null ? 0 : now - compileBurstStartRef.current
    const delay = forceFinal ? 0 : Math.max(0, Math.min(40, 80 - elapsed))
    const timer = window.setTimeout(() => {
      compileBurstStartRef.current = null
      compileTypstSvg(source, width, height, prelude, topInset, pageFill)
        .then((previewSvg) => {
          updateDocument((current) => ({
            ...current,
            pages: current.pages.map((page) => page.id === pageId
              ? {
                  ...page,
                  elements: page.elements.map((element) =>
                    element.id === id && element.kind === 'typst'
                    && current.prelude === prelude && element.source === source && element.width === width && element.height === height
                    && (element.topInset ?? DEFAULT_TYPST_TOP_INSET) === topInset
                    && (element.pageFill ?? '') === pageFill
                      ? {
                          ...element,
                          previewSvg,
                          previewSource: source,
                          previewWidth: width,
                          previewHeight: height,
                          previewPrelude: prelude,
                          previewTopInset: topInset,
                          previewPageFill: pageFill,
                          error: undefined,
                        }
                      : element),
                }
              : page),
          }), false)
        })
        .catch((error) => {
          updateDocument((current) => ({
            ...current,
            pages: current.pages.map((page) => page.id === pageId
              ? {
                  ...page,
                  elements: page.elements.map((element) =>
                    element.id === id && element.kind === 'typst'
                    && current.prelude === prelude && element.source === source && element.width === width && element.height === height
                    && (element.topInset ?? DEFAULT_TYPST_TOP_INSET) === topInset
                    && (element.pageFill ?? '') === pageFill
                      ? { ...element, error: error instanceof Error ? error.message : String(error) }
                      : element),
                }
              : page),
          }), false)
        })
    }, delay)
    return () => window.clearTimeout(timer)
  }, [
    selectedTypstSource,
    selectedTypstWidth,
    selectedTypstHeight,
    selectedTypstTopInset,
    selectedTypstPageFill,
    selectedTypstId,
    selectedPageId,
    document.prelude,
    finalCompileRevision,
    updateDocument,
  ])

  useEffect(() => {
    const prelude = document.prelude
    for (const page of document.pages) {
      for (const element of page.elements) {
        if (element.kind !== 'typst' || (page.id === selectedPageId && element.id === selectedTypstId)) continue
        if (element.previewSvg && element.previewSource === element.source
          && element.previewWidth === element.width && element.previewHeight === element.height
          && element.previewPrelude === prelude
          && element.previewTopInset === (element.topInset ?? DEFAULT_TYPST_TOP_INSET)
          && element.previewPageFill === (element.pageFill ?? '')) continue
        const topInset = element.topInset ?? DEFAULT_TYPST_TOP_INSET
        const pageFill = element.pageFill ?? ''
        const key = JSON.stringify([element.source, element.width, element.height, prelude, topInset, pageFill])
        if (backgroundPreviewRequests.current.get(element.id) === key) continue
        backgroundPreviewRequests.current.set(element.id, key)
        const { id, source, width, height } = element
        const pageId = page.id
        compileTypstSvg(source, width, height, prelude, topInset, pageFill)
          .then((previewSvg) => {
            if (backgroundPreviewRequests.current.get(id) === key) backgroundPreviewRequests.current.delete(id)
            updateDocument((current) => ({
              ...current,
              pages: current.pages.map((candidate) => candidate.id === pageId ? {
                ...candidate,
                elements: candidate.elements.map((item) => item.kind === 'typst' && item.id === id
                  && item.source === source && item.width === width && item.height === height
                  && current.prelude === prelude
                  && (item.topInset ?? DEFAULT_TYPST_TOP_INSET) === topInset
                  && (item.pageFill ?? '') === pageFill
                  ? { ...item, previewSvg, previewSource: source, previewWidth: width,
                    previewHeight: height, previewPrelude: prelude, previewTopInset: topInset,
                    previewPageFill: pageFill, error: undefined }
                  : item),
              } : candidate),
            }), false)
          })
          .catch((error) => updateDocument((current) => ({
            ...current,
            pages: current.pages.map((candidate) => candidate.id === pageId ? {
              ...candidate,
              elements: candidate.elements.map((item) => item.kind === 'typst' && item.id === id
                && item.source === source && item.width === width && item.height === height
                && current.prelude === prelude
                && (item.topInset ?? DEFAULT_TYPST_TOP_INSET) === topInset
                && (item.pageFill ?? '') === pageFill
                ? { ...item, error: error instanceof Error ? error.message : String(error) }
                : item),
            } : candidate),
          }), false))
      }
    }
  }, [document.pages, document.prelude, selectedPageId, selectedTypstId, updateDocument])

  useEffect(() => {
    if (!preludeOpen) return
    const prelude = document.prelude
    const timer = window.setTimeout(() => {
      compileTypstSvg('', 240, 120, prelude)
        .then(() => setPreludeError(undefined))
        .catch((error) => setPreludeError(error instanceof Error ? error.message : String(error)))
    }, 80)
    return () => window.clearTimeout(timer)
  }, [document.prelude, preludeOpen])

  const loadDocument = useCallback((next: EditorDocument) => {
    documentEpochRef.current += 1
    backgroundPreviewRequests.current.clear()
    draggingPageIdRef.current = null
    setDraggingPageId(null)
    setPageDropTarget(null)
    setConfirmNewOpen(false)
    resetDocumentState(next)
    setSelection(null)
    setActivePageId(next.pages[0]?.id ?? null)
    setTool('select')
    setPreludeOpen(false)
    setNotice(null)
  }, [resetDocumentState])

  const openPdf = async (file?: File) => {
    if (!file) return
    try {
      loadDocument(await readPdf(file))
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'That PDF could not be opened.')
    }
  }

  const newDocument = () => {
    const pageId = uid()
    loadDocument({
      name: 'Untitled',
      prelude: '',
      originalPdf: null,
      pages: [{ id: pageId, sourceIndex: null, ...LETTER_PAGE, elements: [] }],
      updatedAt: Date.now(),
    })
  }

  const insertBlankPage = () => {
    const pageId = uid()
    const dimensions = activePage ?? LETTER_PAGE
    updateDocument((current) => {
      const at = Math.max(0, current.pages.findIndex((page) => page.id === activePage?.id) + 1)
      const pages = [...current.pages]
      pages.splice(at, 0, {
        id: pageId,
        sourceIndex: null,
        width: dimensions.width,
        height: dimensions.height,
        elements: [],
      })
      return { ...current, pages }
    })
    setActivePageId(pageId)
    setSelection(null)
  }

  const deletePage = (pageId: string) => {
    if (document.pages.length === 1) return
    const index = document.pages.findIndex((page) => page.id === pageId)
    updateDocument((current) => ({ ...current, pages: current.pages.filter((page) => page.id !== pageId) }))
    const next = document.pages[index + 1] ?? document.pages[index - 1]
    setActivePageId(next?.id ?? null)
    if (selection?.pageId === pageId) setSelection(null)
  }

  const finishPageDrag = () => {
    draggingPageIdRef.current = null
    setDraggingPageId(null)
    setPageDropTarget(null)
  }

  const createTypst = (pageId: string, box: Box) => {
    const element: TypstElement = {
      id: uid(),
      kind: 'typst',
      ...box,
      source: '',
      topInset: DEFAULT_TYPST_TOP_INSET,
    }
    updateDocument((current) => ({
      ...current,
      pages: current.pages.map((page) => page.id === pageId
        ? { ...page, elements: [...page.elements, element] }
        : page),
    }))
    setSelection({ pageId, elementId: element.id })
    setPreludeOpen(false)
    setTool('select')
  }

  const dropElement = useCallback((sourcePageId: string, element: ImageElement | TypstElement, drop: ObjectDrop) => {
    const sourcePage = document.pages.find((page) => page.id === sourcePageId)
    if (!sourcePage) return

    let destinationPageId = sourcePageId
    let destinationShell: HTMLElement | null = null
    for (const shell of globalThis.document.querySelectorAll<HTMLElement>('[data-page-id]')) {
      const rect = shell.getBoundingClientRect()
      if (drop.clientX >= rect.left && drop.clientX <= rect.right
        && drop.clientY >= rect.top && drop.clientY <= rect.bottom) {
        destinationPageId = shell.dataset.pageId || sourcePageId
        destinationShell = shell
        break
      }
    }

    const destinationPage = document.pages.find((page) => page.id === destinationPageId) ?? sourcePage
    let x = element.x
    let y = element.y
    if (destinationPageId !== sourcePageId && destinationShell) {
      const rect = destinationShell.getBoundingClientRect()
      x = (drop.clientX - rect.left) / zoom - drop.grabOffset.x
      y = (drop.clientY - rect.top) / zoom - drop.grabOffset.y
    }
    const moved = {
      ...element,
      x: Math.max(0, Math.min(destinationPage.width - element.width, x)),
      y: Math.max(0, Math.min(destinationPage.height - element.height, y)),
    }

    updateDocument((current) => ({
      ...current,
      pages: current.pages.map((page) => {
        if (page.id === sourcePageId && page.id === destinationPageId) {
          return { ...page, elements: page.elements.map((candidate) => candidate.id === moved.id ? moved : candidate) }
        }
        if (page.id === sourcePageId) {
          return { ...page, elements: page.elements.filter((candidate) => candidate.id !== moved.id) }
        }
        if (page.id === destinationPageId) {
          return { ...page, elements: [...page.elements, moved] }
        }
        return page
      }),
    }))
    setActivePageId(destinationPageId)
    setSelection({ pageId: destinationPageId, elementId: moved.id })
  }, [document.pages, updateDocument, zoom])

  const eraseAt = useCallback((pageId: string, point: Point) => {
    const page = document.pages.find((candidate) => candidate.id === pageId)
    const erasedIds = new Set(page?.elements
      .filter((element) => element.kind === 'stroke' && strokeTouchesPoint(element, point, eraserRadius))
      .map((element) => element.id) ?? [])
    if (!erasedIds.size) return
    updateDocument((current) => ({
      ...current,
      pages: current.pages.map((candidate) => candidate.id === pageId
        ? { ...candidate, elements: candidate.elements.filter((element) => !erasedIds.has(element.id)) }
        : candidate),
    }))
  }, [document.pages, eraserRadius, updateDocument])

  const addImages = useCallback(async (files: File[], targetPageId?: string, dropPoint?: Point) => {
    const images = files.filter(isSupportedImageFile)
    if (!images.length) {
      setNotice('Choose a PNG, JPEG, WebP, or GIF image.')
      return
    }
    const target = document.pages.find((page) => page.id === targetPageId)
      ?? document.pages.find((page) => page.id === activePageId)
      ?? document.pages[0]
    const pageId = target?.id ?? uid()
    const epoch = documentEpochRef.current
    try {
      const decoded = await Promise.all(images.map(decodeImageFile))
      if (documentEpochRef.current !== epoch) return
      const elements = decoded.map((image, index) => placeImage(image, target ?? LETTER_PAGE, dropPoint, index * 16))
      updateDocument((current) => {
        if (!current.pages.length) return {
          ...current,
          pages: [{ id: pageId, sourceIndex: null, ...LETTER_PAGE, elements }],
        }
        if (!current.pages.some((page) => page.id === pageId)) return current
        return {
          ...current,
          pages: current.pages.map((page) => page.id === pageId
            ? { ...page, elements: [...page.elements, ...elements] }
            : page),
        }
      })
      setActivePageId(pageId)
      setSelection({ pageId, elementId: elements[elements.length - 1].id })
      setPreludeOpen(false)
      setTool('select')
      if (images.length < files.length) setNotice('Some files were skipped. Only PNG, JPEG, WebP, and GIF images are supported.')
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'The image could not be added.')
    }
  }, [activePageId, document.pages, updateDocument])

  useEffect(() => {
    const isFileDrag = (event: DragEvent) => Array.from(event.dataTransfer?.types ?? []).includes('Files')
    const targetPage = (target: EventTarget | null) => target instanceof Element
      ? target.closest<HTMLElement>('.page-shell[data-page-id], .page-thumbnail[data-page-id]')
      : null
    const onPaste = (event: ClipboardEvent) => {
      const itemFiles = Array.from(event.clipboardData?.items ?? [])
        .filter((item) => item.kind === 'file' && item.type.startsWith('image/'))
        .map((item) => item.getAsFile())
        .filter((file): file is File => Boolean(file))
      const files = itemFiles.length ? itemFiles : Array.from(event.clipboardData?.files ?? [])
        .filter((file) => file.type.startsWith('image/'))
      if (!files.length) return
      event.preventDefault()
      void addImages(files)
    }
    const onDragOver = (event: DragEvent) => {
      if (!isFileDrag(event)) return
      event.preventDefault()
      if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy'
      setImageDragActive(true)
      setImageDropTarget(targetPage(event.target)?.dataset.pageId ?? null)
    }
    const onDrop = (event: DragEvent) => {
      if (!isFileDrag(event)) return
      event.preventDefault()
      setImageDragActive(false)
      setImageDropTarget(null)
      const files = Array.from(event.dataTransfer?.files ?? [])
      const target = targetPage(event.target)
      const pageId = target?.dataset.pageId
      const point = target?.classList.contains('page-shell')
        && Number.isFinite(event.clientX) && Number.isFinite(event.clientY)
        ? { x: (event.clientX - target.getBoundingClientRect().left) / zoom,
          y: (event.clientY - target.getBoundingClientRect().top) / zoom }
        : undefined
      void addImages(files, pageId, point)
    }
    const onDragLeave = (event: DragEvent) => {
      if (event.relatedTarget) return
      setImageDragActive(false)
      setImageDropTarget(null)
    }
    window.addEventListener('paste', onPaste)
    window.addEventListener('dragover', onDragOver)
    window.addEventListener('drop', onDrop)
    window.addEventListener('dragleave', onDragLeave)
    return () => {
      window.removeEventListener('paste', onPaste)
      window.removeEventListener('dragover', onDragOver)
      window.removeEventListener('drop', onDrop)
      window.removeEventListener('dragleave', onDragLeave)
    }
  }, [addImages, zoom])

  const deleteSelection = useCallback(() => {
    if (!selection) return
    updateDocument((current) => ({
      ...current,
      pages: current.pages.map((page) => page.id === selection.pageId
        ? { ...page, elements: page.elements.filter((element) => element.id !== selection.elementId) }
        : page),
    }))
    setSelection(null)
  }, [selection, updateDocument])

  const doExport = async () => {
    if (!document.pages.length) return
    setExporting(true)
    setNotice(null)
    try {
      const bytes = await exportPdf(document)
      downloadBytes(bytes, `${document.name || 'document'}-edited.pdf`)
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Export failed.')
    } finally {
      setExporting(false)
    }
  }

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (confirmNewOpen) {
        if (event.key === 'Escape') setConfirmNewOpen(false)
        return
      }
      const target = event.target as HTMLElement
      const editing = target.matches('textarea, input')
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'z') {
        event.preventDefault()
        if (event.shiftKey) documentHistory.redo()
        else documentHistory.undo()
      }
      if (!editing && (event.key === 'Backspace' || event.key === 'Delete')) {
        event.preventDefault()
        deleteSelection()
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'o') {
        event.preventDefault()
        openInputRef.current?.click()
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'e') {
        event.preventDefault()
        void doExport()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  })

  const setChosenTool = (next: Tool) => {
    setTool(next)
    if (next !== 'select') {
      setSelection(null)
      setPreludeOpen(false)
    }
  }

  if (!storageReady) {
    return <main className="loading-screen"><RotateCcw className="spin" size={18} /> Loading locally…</main>
  }

  if (!document.pages.length) {
    return (
      <main className={`welcome ${imageDragActive ? 'is-image-drop-target' : ''}`}>
        <div className="welcome-card">
          <div className="welcome-mark">T</div>
          <p className="eyebrow">LOCAL PDF EDITOR</p>
          <h1>Quiet tools for working on PDFs.</h1>
          <p className="welcome-copy">Add images, freehand notes, blank pages, and beautifully typeset Typst—without sending your document anywhere.</p>
          <div className="welcome-actions">
            <button className="primary-large" onClick={() => openInputRef.current?.click()}><FileUp size={18} /> Open a PDF</button>
            <button className="secondary-large" onClick={newDocument}><Plus size={18} /> Blank document</button>
          </div>
          {recoverable && recoverable.pages.length > 0 && (
            <button className="restore-button" onClick={() => loadDocument(recoverable)}>
              <RotateCcw size={15} /> Restore “{recoverable.name}”
              <span>{new Date(recoverable.updatedAt).toLocaleString()}</span>
            </button>
          )}
          <div className="privacy-note"><ShieldCheck size={15} /> Your files stay in this browser.</div>
        </div>
        <input ref={openInputRef} hidden type="file" accept="application/pdf" onChange={(event) => void openPdf(event.target.files?.[0])} />
      </main>
    )
  }

  return (
    <div className="app-shell">
      <Toolbar
        name={document.name}
        tool={tool}
        zoom={zoom}
        canUndo={documentHistory.canUndo}
        canRedo={documentHistory.canRedo}
        exporting={exporting}
        penColor={penColor}
        penRadius={penRadius}
        eraserRadius={eraserRadius}
        preludeOpen={preludeOpen}
        onOpen={() => openInputRef.current?.click()}
        onNew={() => setConfirmNewOpen(true)}
        onImage={() => imageInputRef.current?.click()}
        onTool={setChosenTool}
        onBlankPage={insertBlankPage}
        onUndo={documentHistory.undo}
        onRedo={documentHistory.redo}
        onZoom={(next) => setZoom(Math.min(5, Math.max(0.4, next)))}
        onExport={() => void doExport()}
        onPenColor={setPenColor}
        onPenRadius={setPenRadius}
        onEraserRadius={setEraserRadius}
        onPrelude={() => setPreludeOpen((open) => !open)}
      />
      <div className="workspace">
        <nav className={`page-rail ${thumbnailsOpen ? '' : 'is-collapsed'}`} aria-label="Pages">
          <button
            className="rail-toggle"
            onClick={() => setThumbnailsOpen((open) => !open)}
            title={thumbnailsOpen ? 'Hide page thumbnails' : 'Show page thumbnails'}
            aria-label={thumbnailsOpen ? 'Hide page thumbnails' : 'Show page thumbnails'}
          >
            {thumbnailsOpen ? <PanelLeftClose size={15} /> : <PanelLeftOpen size={15} />}
          </button>
          {thumbnailsOpen && document.pages.map((page, index) => (
            <button
              key={page.id}
              type="button"
              draggable={document.pages.length > 1}
              data-page-id={page.id}
              aria-label={'Page ' + (index + 1) + ', drag to reorder'}
              className={[
                'page-thumbnail',
                activePage?.id === page.id ? 'is-active' : '',
                draggingPageId === page.id ? 'is-dragging' : '',
                pageDropTarget?.pageId === page.id ? 'drop-' + pageDropTarget.side : '',
              ].filter(Boolean).join(' ')}
              onDragStart={(event) => {
                draggingPageIdRef.current = page.id
                setDraggingPageId(page.id)
                setPageDropTarget(null)
                event.dataTransfer.effectAllowed = 'move'
                event.dataTransfer.setData('text/plain', page.id)
              }}
              onDragOver={(event) => {
                if (!draggingPageIdRef.current || draggingPageIdRef.current === page.id) return
                event.preventDefault()
                event.dataTransfer.dropEffect = 'move'
                const side = thumbnailDropSide(event)
                setPageDropTarget((current) => current?.pageId === page.id && current.side === side
                  ? current : { pageId: page.id, side })
              }}
              onDrop={(event) => {
                const draggedId = draggingPageIdRef.current
                if (!draggedId) return
                event.preventDefault()
                const side = thumbnailDropSide(event)
                if (reorderPages(document.pages, draggedId, page.id, side) !== document.pages) {
                  updateDocument((current) => ({
                    ...current,
                    pages: reorderPages(current.pages, draggedId, page.id, side),
                  }))
                }
                finishPageDrag()
              }}
              onDragEnd={finishPageDrag}
              onClick={() => {
                setActivePageId(page.id)
                globalThis.document.getElementById(`page-${page.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
              }}
            >
              <PageThumbnail page={page} pdf={pdfProxy} />
              <span className="thumbnail-number">{index + 1}</span>
              {document.pages.length > 1 && (
                <i
                  role="button"
                  aria-label={`Delete page ${index + 1}`}
                  onClick={(event) => { event.stopPropagation(); deletePage(page.id) }}
                ><Trash2 size={12} /></i>
              )}
            </button>
          ))}
        </nav>
        <main className={`document-scroll ${selectedTypst || preludeOpen ? 'with-inspector' : ''}`}>
          {document.pages.map((page, index) => (
            <div id={`page-${page.id}`} key={page.id} className={`page-positioner ${imageDropTarget === page.id ? 'is-image-drop-target' : ''}`}>
              <CanvasPage
                page={page}
                pageNumber={index + 1}
                pdf={pdfProxy}
                zoom={zoom}
                tool={tool}
                selection={selection}
                penColor={penColor}
                penRadius={penRadius}
                eraserRadius={eraserRadius}
                onActivate={() => setActivePageId(page.id)}
                onSelect={(elementId) => {
                  setPreludeOpen(false)
                  setSelection(elementId ? { pageId: page.id, elementId } : null)
                }}
                onChangeElement={(element, record) => updateElement(page.id, element, record)}
                onResizeEnd={(element) => {
                  if (element.kind === 'typst') setFinalCompileRevision((revision) => revision + 1)
                }}
                onDropElement={(element, drop) => dropElement(page.id, element, drop)}
                onDragPreview={setDragPreview}
                onAddStroke={(points) => {
                  if (!points.length) return
                  updateDocument((current) => ({
                    ...current,
                    pages: current.pages.map((candidate) => candidate.id === page.id
                      ? {
                          ...candidate,
                          elements: [...candidate.elements, {
                            id: uid(), kind: 'stroke', points, color: penColor, radius: penRadius,
                          }],
                        }
                      : candidate),
                  }))
                }}
                onEraseAt={(point) => eraseAt(page.id, point)}
                onCreateTypst={(box) => createTypst(page.id, box)}
              />
            </div>
          ))}
        </main>
        {!preludeOpen && selectedTypst && selection && (
          <TypstInspector
            element={selectedTypst}
            onSourceChange={(source) => updateElement(selection.pageId, { ...selectedTypst, source })}
            onTopInsetChange={(topInset) => updateElement(selection.pageId, { ...selectedTypst, topInset })}
            onPageFillChange={(pageFill) => updateElement(selection.pageId, { ...selectedTypst, pageFill })}
            onDelete={deleteSelection}
            onClose={() => setSelection(null)}
          />
        )}
        {preludeOpen && (
          <PreludeInspector
            source={document.prelude}
            error={preludeError}
            onChange={(prelude) => updateDocument((current) => ({ ...current, prelude }))}
            onClose={() => setPreludeOpen(false)}
          />
        )}
        {dragPreview && (
          <div
            className="object-drag-preview"
            style={{
              left: dragPreview.clientX - dragPreview.grabOffset.x * zoom,
              top: dragPreview.clientY - dragPreview.grabOffset.y * zoom,
              width: dragPreview.element.width * zoom,
              height: dragPreview.element.height * zoom,
            }}
          >
            {dragPreview.element.kind === 'image' && (
              <img src={dragPreview.element.dataUrl} alt="" />
            )}
            {dragPreview.element.kind === 'typst' && dragPreview.element.previewSvg && (
              <img
                src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(dragPreview.element.previewSvg)}`}
                alt=""
              />
            )}
          </div>
        )}
      </div>
      {notice && <div className="notice" role="alert">{notice}<button onClick={() => setNotice(null)}>×</button></div>}
      {confirmNewOpen && (
        <div className="dialog-backdrop" onClick={() => setConfirmNewOpen(false)}>
          <div className="confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="confirm-new-title" aria-describedby="confirm-new-description" onClick={(event) => event.stopPropagation()}>
            <h2 id="confirm-new-title">Create a new document?</h2>
            <p id="confirm-new-description">This will replace the pages you’re editing. Export the current PDF first if you want to keep a copy.</p>
            <div className="confirm-actions">
              <button autoFocus onClick={() => setConfirmNewOpen(false)}>Keep editing</button>
              <button className="confirm-new-button" onClick={newDocument}>Create new document</button>
            </div>
          </div>
        </div>
      )}
      <input ref={openInputRef} hidden type="file" accept="application/pdf" onChange={(event) => void openPdf(event.target.files?.[0])} />
      <input ref={imageInputRef} hidden type="file" multiple accept="image/png,image/jpeg,image/webp,image/gif" onChange={(event) => {
        void addImages(Array.from(event.target.files ?? []))
        event.target.value = ''
      }} />
    </div>
  )
}

export default App
