self.onmessage = async (event: MessageEvent<{ id: number; source: string }>) => {
  const { id, source } = event.data
  try {
    // Install the message handler before WASM's asynchronous initialization.
    const { format } = await import('@typstyle/typstyle-wasm-bundler')
    const result = format(source, {
      tab_spaces: 2,
      max_width: 80,
      wrap_mode: 'none',
      collapse_markup_spaces: false,
      reorder_import_items: false,
    })
    self.postMessage({ id, ok: true, result })
  } catch (error) {
    self.postMessage({ id, ok: false, error: String(error) })
  }
}
