type Listener = () => void
const listeners = new Set<Listener>()
let pendingRefetch = false

export function signalLeadsUpdated() {
  pendingRefetch = true
  listeners.forEach((fn) => fn())
}

export function subscribeLeadsUpdated(fn: Listener): () => void {
  listeners.add(fn)
  if (pendingRefetch) {
    pendingRefetch = false
    fn()
  }
  return () => listeners.delete(fn)
}
