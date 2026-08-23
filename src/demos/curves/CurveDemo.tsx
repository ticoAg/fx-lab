import { useEffect, useRef } from 'react'
import {
  buildPath,
  getDetailScale,
  getParticle,
  getRotation,
} from './official.js'

const SVG_NS = 'http://www.w3.org/2000/svg'

export function CurveDemo({ config }: { config: Record<string, unknown> }) {
  const frameRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const frame = frameRef.current
    if (!frame) return
    const svg = document.createElementNS(SVG_NS, 'svg')
    svg.setAttribute('viewBox', '0 0 100 100')
    svg.setAttribute('class', 'curve-svg')
    svg.style.width = '100%'
    svg.style.height = '100%'
    const group = document.createElementNS(SVG_NS, 'g')
    const path = document.createElementNS(SVG_NS, 'path')
    path.setAttribute('stroke', 'currentColor')
    path.setAttribute('stroke-width', String(config.strokeWidth ?? 4.5))
    path.setAttribute('stroke-linecap', 'round')
    path.setAttribute('fill', 'none')
    path.setAttribute('opacity', '0.16')
    group.appendChild(path)
    svg.appendChild(group)
    frame.appendChild(svg)
    const count = Number(config.particleCount ?? 64)
    const nodes = Array.from({ length: count }, () => {
      const c = document.createElementNS(SVG_NS, 'circle')
      c.setAttribute('fill', 'currentColor')
      group.appendChild(c)
      return c
    })
    const start = performance.now()
    const phase = Math.random()
    let raf = 0
    const tick = (now: number) => {
      const time = now - start
      const duration = Number(config.durationMs ?? 5000)
      const progress = ((time + phase * duration) % duration) / duration
      const detailScale = getDetailScale(time, config, phase)
      const rotation = getRotation(time, config, phase)
      group.setAttribute('transform', `rotate(${rotation} 50 50)`)
      path.setAttribute('d', buildPath(config, detailScale))
      nodes.forEach((node, index) => {
        const p = getParticle(config, index, progress, detailScale)
        node.setAttribute('cx', p.x.toFixed(2))
        node.setAttribute('cy', p.y.toFixed(2))
        node.setAttribute('r', p.radius.toFixed(2))
        node.setAttribute('opacity', p.opacity.toFixed(3))
      })
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(raf)
      svg.remove()
    }
  }, [config])

  return <div ref={frameRef} className="curve-stage" />
}
