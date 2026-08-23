import { useEffect, useRef, useState, type ReactNode } from 'react'
import { acquireWebgl } from '../webglGate.ts'

type Props = {
  children: ReactNode
  webgl?: boolean
  className?: string
}

export function LazyMount({ children, webgl, className }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  const [slot, setSlot] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting),
      { rootMargin: '80px', threshold: 0.05 },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  useEffect(() => {
    if (!visible) {
      setSlot(false)
      return
    }
    if (!webgl) {
      setSlot(true)
      return
    }
    let release: (() => void) | undefined
    let cancelled = false
    acquireWebgl().then((r) => {
      if (cancelled) {
        r()
        return
      }
      release = r
      setSlot(true)
    })
    return () => {
      cancelled = true
      release?.()
    }
  }, [visible, webgl])

  return (
    <div ref={ref} className={className}>
      {slot ? children : <div className="lazy-placeholder">等待进入视口…</div>}
    </div>
  )
}
