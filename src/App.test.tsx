import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import type { Box, EditorPage } from './types'
import { compileTypstSvg } from './typst/client'

vi.mock('./components/CanvasPage', () => ({
  CanvasPage: ({ page, onCreateTypst }: { page: EditorPage; onCreateTypst: (box: Box) => void }) => <section className="page-shell" data-page-id={page.id}
    data-elements={JSON.stringify(page.elements.map((element) => ({
      kind: element.kind, x: 'x' in element ? element.x : undefined, y: 'y' in element ? element.y : undefined,
    })))}><button onClick={() => onCreateTypst({ x: 10, y: 10, width: 120, height: 50 })}>Add test Typst box</button></section>,
}))

vi.mock('./lib/images', async (importOriginal) => ({
  ...await importOriginal<typeof import('./lib/images')>(),
  decodeImageFile: async () => ({ dataUrl: 'data:image/png;base64,AA==', mime: 'image/png' as const, naturalWidth: 100, naturalHeight: 80 }),
}))

vi.mock('./lib/storage', () => ({
  loadSession: async () => undefined,
  saveSession: async () => undefined,
}))

vi.mock('./typst/client', () => ({
  compileTypstSvg: vi.fn(async () => '<svg xmlns="http://www.w3.org/2000/svg" />'),
  compileTypstPdf: async () => new Uint8Array(),
}))

afterEach(cleanup)

describe('page controls', () => {
  it('adds pages without replacing the document and confirms a new document', async () => {
    const { container } = render(<App />)
    fireEvent.click(await screen.findByRole('button', { name: 'Blank document' }))
    expect(container.querySelectorAll('.page-shell')).toHaveLength(1)

    fireEvent.click(screen.getByRole('button', { name: 'Insert blank page' }))
    expect(container.querySelectorAll('.page-shell')).toHaveLength(2)

    fireEvent.click(screen.getByRole('button', { name: 'New document' }))
    expect(screen.getByRole('alertdialog')).toBeInTheDocument()
    expect(container.querySelectorAll('.page-shell')).toHaveLength(2)
    fireEvent.click(screen.getByRole('button', { name: 'Keep editing' }))
    expect(container.querySelectorAll('.page-shell')).toHaveLength(2)

    fireEvent.click(screen.getByRole('button', { name: 'New document' }))
    fireEvent.click(screen.getByRole('button', { name: 'Create new document' }))
    await waitFor(() => expect(container.querySelectorAll('.page-shell')).toHaveLength(1))
  })

  it('moves a thumbnail to the chosen position and can undo the move', async () => {
    const { container } = render(<App />)
    fireEvent.click(await screen.findByRole('button', { name: 'Blank document' }))
    fireEvent.click(screen.getByRole('button', { name: 'Insert blank page' }))
    fireEvent.click(screen.getByRole('button', { name: 'Insert blank page' }))

    const order = () => Array.from(container.querySelectorAll<HTMLButtonElement>('.page-thumbnail'))
      .map((button) => button.dataset.pageId)
    const before = order()
    const [first, , third] = Array.from(container.querySelectorAll<HTMLButtonElement>('.page-thumbnail'))
    const dataTransfer = { effectAllowed: '', dropEffect: '', setData: vi.fn() }
    fireEvent.dragStart(first, { dataTransfer })
    fireEvent.dragOver(third, { dataTransfer, clientY: 100 })
    expect(third).toHaveClass('drop-after')
    fireEvent.drop(third, { dataTransfer, clientY: 100 })

    expect(order()).toEqual([before[1], before[2], before[0]])
    expect(Array.from(container.querySelectorAll<HTMLElement>('.page-shell')).map((page) => page.dataset.pageId))
      .toEqual([before[1], before[2], before[0]])
    fireEvent.click(screen.getByTitle('Undo'))
    expect(order()).toEqual(before)
  })
})

describe('image insertion', () => {
  it('pastes into the active page and drops at a position on another page', async () => {
    const { container } = render(<App />)
    fireEvent.click(await screen.findByRole('button', { name: 'Blank document' }))
    fireEvent.click(screen.getByRole('button', { name: 'Insert blank page' }))
    const [first, second] = Array.from(container.querySelectorAll<HTMLElement>('.page-shell'))
    const file = new File(['image'], 'photo.png', { type: 'image/png' })

    fireEvent.paste(window, { clipboardData: { items: [{ kind: 'file', type: 'image/png', getAsFile: () => file }] } })
    await waitFor(() => expect(JSON.parse(second.dataset.elements ?? '[]')).toHaveLength(1))

    vi.spyOn(first, 'getBoundingClientRect').mockReturnValue({ left: 20, top: 30 } as DOMRect)
    const dataTransfer = { types: ['Files'], files: [file], dropEffect: '' }
    fireEvent.dragOver(first, { dataTransfer, clientX: 110, clientY: 120 })
    expect(first.parentElement).toHaveClass('is-image-drop-target')
    const drop = new MouseEvent('drop', { bubbles: true, cancelable: true, clientX: 110, clientY: 120 })
    Object.defineProperty(drop, 'dataTransfer', { value: dataTransfer })
    fireEvent(first, drop)
    await waitFor(() => expect(JSON.parse(first.dataset.elements ?? '[]')).toHaveLength(1))
    expect(JSON.parse(first.dataset.elements ?? '[]')[0]).toMatchObject({ kind: 'image', x: 50, y: 60 })
    expect(JSON.parse(second.dataset.elements ?? '[]')).toHaveLength(1)
  })

  it('creates a blank page when an image is pasted on the welcome screen', async () => {
    const { container } = render(<App />)
    await screen.findByRole('button', { name: 'Blank document' })
    const file = new File(['image'], 'photo.png', { type: 'image/png' })
    fireEvent.paste(window, { clipboardData: { items: [{ kind: 'file', type: 'image/png', getAsFile: () => file }] } })
    await waitFor(() => expect(container.querySelectorAll('.page-shell')).toHaveLength(1))
    expect(JSON.parse(container.querySelector<HTMLElement>('.page-shell')?.dataset.elements ?? '[]')).toHaveLength(1)
  })
})

describe('zoom controls', () => {
  it('reaches 500% without exceeding it', async () => {
    render(<App />)
    fireEvent.click(await screen.findByRole('button', { name: 'Blank document' }))
    const zoomIn = screen.getByRole('button', { name: 'Zoom in' })
    for (let index = 0; index < 50; index += 1) fireEvent.click(zoomIn)
    expect(screen.getByText('500%')).toBeInTheDocument()
    fireEvent.click(zoomIn)
    expect(screen.getByText('500%')).toBeInTheDocument()
  })
})

describe('Typst top inset', () => {
  it('can be changed for a selected box and triggers a new preview', async () => {
    render(<App />)
    fireEvent.click(await screen.findByRole('button', { name: 'Blank document' }))
    fireEvent.click(screen.getByRole('button', { name: 'Add test Typst box' }))
    const inset = screen.getByRole('spinbutton', { name: 'Top inset' })
    expect(inset).toHaveValue(4)
    fireEvent.change(inset, { target: { value: '12' } })
    expect(inset).toHaveValue(12)
    await waitFor(() => expect(compileTypstSvg).toHaveBeenCalledWith('', 120, 50, '', 12, ''))
    fireEvent.change(screen.getByLabelText('Fill (Typst)'), { target: { value: 'rgb("#f5f0e6")' } })
    await waitFor(() => expect(compileTypstSvg).toHaveBeenCalledWith('', 120, 50, '', 12, 'rgb("#f5f0e6")'))
  })
})
