import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it } from 'vitest'
import { CompileErrors } from './CompileErrors'

afterEach(cleanup)

it('starts collapsed, counts diagnostic headers rather than hints, and retains the open state while typing', () => {
  const first = 'incremental compile: /preview.typ:19:1: error: unknown variable: sdf\nhints: if you meant text, use quotes\nThis hint mentions error: without being a diagnostic.'
  const second = '\n/preview.typ:22:3: error: expected expression'
  const view = render(<CompileErrors error={first} />)
  const details = view.container.querySelector('details')!
  expect(details.open).toBe(false)
  expect(screen.getByLabelText('1 error')).toHaveTextContent('Errors1')
  view.rerender(<CompileErrors error={first + second} />)
  expect(details.open).toBe(false)
  fireEvent.click(screen.getByLabelText('2 errors'))
  expect(details.open).toBe(true)
  expect(view.container.querySelector('pre')).toHaveTextContent('expected expression')
  view.rerender(<CompileErrors error={first} />)
  expect(details.open).toBe(true)
  fireEvent.click(screen.getByLabelText('1 error'))
  expect(details.open).toBe(false)
})

it('handles runtime errors and resets to collapsed after errors clear', () => {
  const view = render(<CompileErrors error="initialize runtime: Could not load bundled font" />)
  fireEvent.click(screen.getByLabelText('1 error'))
  view.rerender(<CompileErrors />)
  expect(view.container).toBeEmptyDOMElement()
  view.rerender(<CompileErrors error="incremental compile: incomplete input" />)
  expect(view.container.querySelector('details')!.open).toBe(false)
})
