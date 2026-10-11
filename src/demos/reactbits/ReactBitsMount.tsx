import { useEffect, useRef, useState, type ComponentType, type ReactNode } from 'react'
import { RB_META } from './catalog.ts'
import { modelUrl } from '../../cdn.ts'

const modules = import.meta.glob('../../react-bits/**/*.jsx')

function childFor(kind: string | null): ReactNode {
  if (kind === 'button') return <button className="demo-btn" type="button">磁力按钮</button>
  if (kind === 'text') return '渐变文字'
  if (kind === 'tile') return <div className="demo-tile">官方组件</div>
  return null
}

export function ReactBitsMount({ name, preview = false }: { name: string; preview?: boolean }) {
  const meta = RB_META[name]
  const [Comp, setComp] = useState<ComponentType<Record<string, unknown>> | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const boxRef = useRef<HTMLDivElement>(null)

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
  const props: Record<string, unknown> = { ...(meta?.defaults ?? {}) }
  if (name === 'ReflectiveCard') props.preview = preview
  if (name === 'ModelViewer') props.url = modelUrl('sunglasses.glb')
  // VariableProximity measures the pointer against containerRef and does nothing without it.
  if (name === 'VariableProximity') {
    return (
      <div ref={boxRef} className="demo-center">
        <Comp {...props} containerRef={boxRef} />
      </div>
    )
  }
  return <Comp {...props}>{childFor(meta?.childrenKind ?? null)}</Comp>
}
