import { useEffect, useRef, useState } from 'react'
import { useSvgSource } from './useSvgSource.ts'

const SHADOW_STYLE = `<style>
:host { display: block; width: 100%; height: 100%; color: inherit; }
:host > svg { width: 100%; height: 100%; display: block; overflow: visible; }
</style>`

/**
 * Inline an SVG in a shadow root so currentColor follows the stage
 * and each icon's CSS animation stays scoped.
 * The file is fetched only when the element comes near the viewport,
 * so long pages do not download and parse every icon up front.
 */
export function KitSvg({
  src,
  alt,
  className,
}: {
  src: string
  alt: string
  className?: string
}) {
  const hostRef = useRef<HTMLSpanElement>(null)
  const [near, setNear] = useState(() => typeof IntersectionObserver === 'undefined')
  const { text, error } = useSvgSource(near ? src : null)

  useEffect(() => {
    const host = hostRef.current
    if (!host || !text) return
    const root = host.shadowRoot ?? host.attachShadow({ mode: 'open' })
    root.innerHTML = `${SHADOW_STYLE}${text}`
  }, [text])

  useEffect(() => {
    if (near || !hostRef.current) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) setNear(true)
      },
      { rootMargin: '300px' },
    )
    observer.observe(hostRef.current)
    return () => observer.disconnect()
  }, [near])

  if (error) {
    return <img src={src} alt={alt} className={className} />
  }

  const classes = className ? `kit-svg ${className}` : 'kit-svg'
  return (
    <span
      ref={hostRef}
      className={classes}
      role={alt ? 'img' : undefined}
      aria-label={alt || undefined}
      aria-hidden={alt ? undefined : true}
    />
  )
}
