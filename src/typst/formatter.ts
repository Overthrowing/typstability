type Response = { id: number } & (
  | { ok: true; result: string }
  | { ok: false; error: string }
)

let worker: Worker | undefined
let nextId = 0
const pending = new Map<number, {
  resolve: (source: string) => void
  reject: (error: Error) => void
}>()

// Load the formatter and its WASM only when Format is first requested.
export function formatTypst(source: string): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!worker) {
      worker = new Worker(new URL('./formatter.worker.ts', import.meta.url), { type: 'module' })
      worker.onmessage = (event: MessageEvent<Response>) => {
        const response = event.data
        const request = pending.get(response.id)
        if (!request) return
        pending.delete(response.id)
        if (response.ok) request.resolve(response.result)
        else request.reject(new Error(response.error))
      }
      const fail = () => {
        pending.forEach(({ reject }) => reject(new Error('The formatter could not load. Please try again.')))
        pending.clear()
        worker?.terminate()
        worker = undefined
      }
      worker.onerror = fail
      worker.onmessageerror = fail
    }
    const id = ++nextId
    pending.set(id, { resolve, reject })
    worker.postMessage({ id, source })
  })
}
