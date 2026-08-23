from pathlib import Path
src = Path("/workspace/fx-lab/src")

(src / "vite-env.d.ts").write_text("""/// <reference types="vite/client" />

declare module '*.jsx' {
  import type { ComponentType } from 'react'
  const Component: ComponentType<Record<string, unknown>>
  export default Component
}
""")

(src / "types.ts").write_text("""export type SourceId = 'all' | 'animejs' | 'react-bits' | 'threeui' | 'math-curve-loaders'

export type DemoSource = Exclude<SourceId, 'all'>

export type DemoItem = {
  id: string
  source: DemoSource
  name: string
  zh: string
  en: string
  webgl: boolean
  code: string
}
""")

(src / "webglGate.ts").write_text("""const MAX = 4
let active = 0
const waiters: Array<() => void> = []

export function acquireWebgl(): Promise<() => void> {
  return new Promise((resolve) => {
    const grant = () => {
      active += 1
      let released = false
      resolve(() => {
        if (released) return
        released = true
        active -= 1
        const next = waiters.shift()
        if (next) next()
      })
    }
    if (active < MAX) grant()
    else waiters.push(grant)
  })
}
""")

print("core types ok")
