/// <reference lib="webworker" />
// cubejs is a CommonJS bundle whose solver looks the Cube class up on `this`,
// so we evaluate both files with `this` bound to the worker global.
import cubeSrc from 'cubejs/lib/cube.js?raw'
import solveSrc from 'cubejs/lib/solve.js?raw'

interface CubeApi {
  initSolver(): void
  fromString(s: string): { solve(maxDepth?: number): string }
}

const g = self as unknown as { Cube?: CubeApi }

function load(): CubeApi {
  if (g.Cube) return g.Cube
  const mod: { exports: unknown } = { exports: {} }
  new Function('module', 'exports', 'require', cubeSrc).call(self, mod, mod.exports, () => ({}))
  g.Cube = mod.exports as CubeApi
  const mod2 = { exports: {} }
  new Function('module', 'exports', 'require', solveSrc).call(self, mod2, mod2.exports, () => g.Cube)
  return g.Cube
}

let ready = false
self.onmessage = (e: MessageEvent<{ id: number; facelets: string }>) => {
  try {
    const Cube = load()
    if (!ready) {
      Cube.initSolver()
      ready = true
    }
    const solution = Cube.fromString(e.data.facelets).solve()
    self.postMessage({ id: e.data.id, solution })
  } catch (err) {
    self.postMessage({ id: e.data.id, error: String(err) })
  }
}
