import { afterEach, expect, it, vi } from 'vitest'
import type { PDFDocumentProxy } from 'pdfjs-dist'
import { renderPdfPage } from './pdf'

vi.mock('../typst/client', () => ({ compileTypstPdf: vi.fn() }))
vi.mock('pdfjs-dist', () => ({ GlobalWorkerOptions: {} }))
afterEach(() => vi.restoreAllMocks())

it('cancels stale PDF draws and only publishes the latest zoom to the visible canvas', async () => {
  const drawImage = vi.fn()
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({ drawImage } as unknown as CanvasRenderingContext2D)
  const pending: { finish: () => void; cancel: ReturnType<typeof vi.fn>; canvas: HTMLCanvasElement }[] = []
  const page = {
    getViewport: ({ scale }: { scale: number }) => ({ width: 600 * scale, height: 800 * scale }),
    render: ({ canvas }: { canvas: HTMLCanvasElement }) => {
      let finish!: () => void
      const promise = new Promise<void>((resolve) => { finish = resolve })
      const cancel = vi.fn()
      pending.push({ finish, cancel, canvas })
      return { promise, cancel }
    },
  }
  const proxy = { getPage: vi.fn().mockResolvedValue(page) } as unknown as PDFDocumentProxy
  const canvas = document.createElement('canvas')
  const old = new AbortController()
  const first = renderPdfPage(proxy, 1, canvas, 1, old.signal)
  await Promise.resolve()
  old.abort()
  const second = renderPdfPage(proxy, 1, canvas, 0.5, new AbortController().signal)
  await Promise.resolve()
  expect(pending[0].cancel).toHaveBeenCalledOnce()
  expect(pending[0].canvas).not.toBe(pending[1].canvas)
  pending[1].finish()
  await second
  pending[0].finish()
  await first
  expect(drawImage).toHaveBeenCalledTimes(1)
  expect(drawImage).toHaveBeenCalledWith(pending[1].canvas, 0, 0)
  expect(canvas.width).toBe(300 * (window.devicePixelRatio || 1))
})

it('does not start drawing if superseded while loading the page', async () => {
  const render = vi.fn()
  const proxy = { getPage: vi.fn().mockResolvedValue({ render }) } as unknown as PDFDocumentProxy
  const controller = new AbortController()
  const drawing = renderPdfPage(proxy, 1, document.createElement('canvas'), 1, controller.signal)
  controller.abort()
  await drawing
  expect(render).not.toHaveBeenCalled()
})
