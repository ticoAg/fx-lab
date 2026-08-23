import { useEffect, useState, type ComponentType } from 'react'
import { threeuiLoaders } from './loaders.ts'

export function ThreeUIMount({ exportName }: { exportName: string }) {
  const [Comp, setComp] = useState<ComponentType<Record<string, unknown>> | null>(null)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    const load = threeuiLoaders[exportName]
    if (!load) {
      setErr('export not found')
      return
    }
    load()
      .then((mod) => {
        if (!alive) return
        const C = (mod[exportName] || mod.default) as ComponentType<Record<string, unknown>>
        if (!C) throw new Error('named export missing')
        setComp(() => C)
      })
      .catch((e: Error) => {
        if (alive) setErr(e.message || String(e))
      })
    return () => {
      alive = false
    }
  }, [exportName])

  if (err) throw new Error(err)
  if (!Comp) return <div className="lazy-placeholder">加载 ThreeUI…</div>
  return <Comp sourceUrl="/" assetBaseUrl="/" />
}
