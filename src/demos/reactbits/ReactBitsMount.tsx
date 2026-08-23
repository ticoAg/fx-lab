import { useEffect, useState, type ComponentType, type ReactNode } from 'react'
import { RB_META } from './catalog.ts'

const modules = import.meta.glob('../../react-bits/**/*.jsx')

function childFor(kind: string | null): ReactNode {
  if (kind === 'button') return <button className="demo-btn" type="button">磁力按钮</button>
  if (kind === 'text') return '渐变文字'
  if (kind === 'tile') return <div className="demo-tile">官方组件</div>
  return null
}

export function ReactBitsMount({ name }: { name: string }) {
  const meta = RB_META[name]
  const [Comp, setComp] = useState<ComponentType<Record<string, unknown>> | null>(null)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    const key = Object.keys(modules).find((k) => k.endsWith(`/${name}.jsx`) || k.endsWith(`/${name}/${name}.jsx`))
    const load = key ? modules[key] : undefined
    if (!load) {
      setErr('component file not found')
      return
    }
    load()
      .then((mod) => {
        if (!alive) return
        const m = mod as Record<string, ComponentType<Record<string, unknown>> | undefined>
        const picked = m.default || m[name]
        if (!picked) throw new Error('export missing')
        setComp(() => picked)
      })
      .catch((e: Error) => {
        if (alive) setErr(e.message || String(e))
      })
    return () => {
      alive = false
    }
  }, [name])

  if (err) throw new Error(err)
  if (!Comp) return <div className="lazy-placeholder">加载 react-bits…</div>
  const props = { ...(meta?.defaults ?? {}) }
  return <Comp {...props}>{childFor(meta?.childrenKind ?? null)}</Comp>
}
