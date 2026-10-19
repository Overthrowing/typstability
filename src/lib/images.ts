import type { EditorPage, ImageElement, Point } from '../types'
import { uid } from '../types'

const supportedTypes = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif'])

export function isSupportedImageFile(file: File) {
  const mime = file.type.toLowerCase()
  return supportedTypes.has(mime)
    || (!mime || mime === 'application/octet-stream') && /\.(png|jpe?g|webp|gif)$/i.test(file.name)
}

export async function decodeImageFile(file: File): Promise<Pick<ImageElement, 'dataUrl' | 'mime'> & { naturalWidth: number; naturalHeight: number }> {
  if (!isSupportedImageFile(file)) throw new Error('Choose a PNG, JPEG, WebP, or GIF image.')

  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error ?? new Error('The image could not be read.'))
    reader.readAsDataURL(file)
  })
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const next = new Image()
    next.onload = () => resolve(next)
    next.onerror = () => reject(new Error('The image could not be opened.'))
    next.src = dataUrl
  })
  if (!image.naturalWidth || !image.naturalHeight) throw new Error('The image has no usable dimensions.')

  const mime = file.type.toLowerCase()
  const directMime = mime === 'image/png' || (!mime || mime === 'application/octet-stream') && /\.png$/i.test(file.name) ? 'image/png'
    : mime === 'image/jpeg' || (!mime || mime === 'application/octet-stream') && /\.jpe?g$/i.test(file.name) ? 'image/jpeg'
      : null
  if (directMime) return { dataUrl, mime: directMime, naturalWidth: image.naturalWidth, naturalHeight: image.naturalHeight }

  const canvas = document.createElement('canvas')
  canvas.width = image.naturalWidth
  canvas.height = image.naturalHeight
  const context = canvas.getContext('2d')
  if (!context) throw new Error('The image could not be converted for PDF export.')
  context.drawImage(image, 0, 0)
  return { dataUrl: canvas.toDataURL('image/png'), mime: 'image/png', naturalWidth: image.naturalWidth, naturalHeight: image.naturalHeight }
}

export function placeImage(
  image: Awaited<ReturnType<typeof decodeImageFile>>,
  page: Pick<EditorPage, 'width' | 'height'>,
  dropPoint?: Point,
  offset = 0,
): ImageElement {
  const scale = Math.min(1, 320 / image.naturalWidth,
    Math.max(1, page.width - 72) / image.naturalWidth,
    Math.max(1, page.height - 144) / image.naturalHeight)
  const width = image.naturalWidth * scale
  const height = image.naturalHeight * scale
  const clamp = (value: number, limit: number) => Math.max(0, Math.min(limit, value))
  const x = clamp((dropPoint ? dropPoint.x - width / 2 : (page.width - width) / 2) + offset, page.width - width)
  const y = clamp((dropPoint ? dropPoint.y - height / 2 : 72) + offset, page.height - height)
  return { id: uid(), kind: 'image', x, y, width, height, dataUrl: image.dataUrl, mime: image.mime }
}
