import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ActionMenu } from './ActionMenu'

afterEach(cleanup)

describe('ActionMenu', () => {
  it('keeps items clickable when Safari reports a null blur destination', () => {
    const insertImage = vi.fn()
    const insertPage = vi.fn()
    render(<ActionMenu label="Insert" items={[
      { label: 'Image', icon: null, onSelect: insertImage },
      { label: 'Blank page', icon: null, onSelect: insertPage },
    ]} />)

    fireEvent.click(screen.getByRole('button', { name: 'Insert' }))
    const page = screen.getByRole('menuitem', { name: 'Blank page' })
    fireEvent.blur(screen.getByRole('menuitem', { name: 'Image' }), { relatedTarget: null })
    expect(page).toBeInTheDocument()
    fireEvent.click(page)
    expect(insertPage).toHaveBeenCalledOnce()

    fireEvent.click(screen.getByRole('button', { name: 'Insert' }))
    fireEvent.click(screen.getByRole('menuitem', { name: 'Image' }))
    expect(insertImage).toHaveBeenCalledOnce()
  })

  it('closes when focus moves outside the menu', () => {
    render(<><ActionMenu label="Insert" items={[
      { label: 'Blank page', icon: null, onSelect: vi.fn() },
    ]} /><button>Outside</button></>)
    fireEvent.click(screen.getByRole('button', { name: 'Insert' }))
    fireEvent.focusIn(screen.getByRole('button', { name: 'Outside' }))
    expect(screen.queryByRole('menuitem', { name: 'Blank page' })).not.toBeInTheDocument()
  })
})
