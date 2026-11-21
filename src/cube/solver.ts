let worker: Worker | null = null
let seq = 0
const waiting = new Map<number, (r: { solution?: string; error?: string }) => void>()

function getWorker() {
  if (!worker) {
    worker = new Worker(new URL('./solver.worker.ts', import.meta.url), { type: 'module' })
    worker.onmessage = (e) => {
      const cb = waiting.get(e.data.id)
      waiting.delete(e.data.id)
      cb?.(e.data)
    }
  }
  return worker
}

/** Warm up the solver tables in the background. */
export function preloadSolver() {
  solveFacelets('UUUUUUUUURRRRRRRRRFFFFFFFFFDDDDDDDDDLLLLLLLLLBBBBBBBBB').catch(() => {})
}

export function solveFacelets(facelets: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const id = ++seq
    waiting.set(id, (r) => (r.error ? reject(new Error(r.error)) : resolve(r.solution ?? '')))
    getWorker().postMessage({ id, facelets })
  })
}
