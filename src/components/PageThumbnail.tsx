import { useEffect, useRef } from 'react'
import type { PDFDocumentProxy } from 'pdfjs-dist'
import type { EditorPage } from '../types'
import { renderPdfPage } from '../lib/pdf'

const THUMBNAIL_WIDTH = 100

type Props = {
  page: EditorPage
  pdf: PDFDocumentProxy | null
}

export function PageThumbnail({ page, pdf }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const scale = THUMBNAIL_WIDTH / page.width

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !pdf || page.sourceIndex === null) return
    void renderPdfPage(pdf, page.sourceIndex + 1, canvas, scale).then(() => {
      canvas.style.width = '100%'
      canvas.style.height = '100%'
    }).catch(() => undefined)
  }, [page.sourceIndex, pdf, scale])

  return (
    <span
      className="thumbnail-paper"
      style={{ width: '100%', aspectRatio: `${page.width} / ${page.height}` }}
      aria-hidden="true"
    >
      {page.sourceIndex === null ? <span className="thumbnail-blank" /> : <canvas ref={canvasRef} />}
    </span>
  )
}
