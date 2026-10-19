import type { Box } from '../types'

export const MIN_BOX_SCREEN_PIXELS = 1

export function minimumBoxDimension(zoom: number) {
  return MIN_BOX_SCREEN_PIXELS / zoom
}

export function canCreateBox(box: Pick<Box, 'width' | 'height'>, zoom: number) {
  return box.width >= minimumBoxDimension(zoom)
    && box.height >= minimumBoxDimension(zoom)
}
