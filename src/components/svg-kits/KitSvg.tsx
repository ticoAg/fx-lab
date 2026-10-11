import { useEffect, useRef } from 'react'
import { useSvgSource } from './useSvgSource.ts'

const SHADOW_STYLE = `<style>
:host { display: block; color: inherit; }
:host([data-layout="fill"]) { width: 100%; height: 100%; }
:host([data-layout="intrinsic"]) { width: 100%; height: auto; }
:host([data-layout="fill"]) svg { width: 100%; height: 100%; display: block; overflow: visible; }
:host([data-layout="intrinsic"]) svg { width: 100%; height: auto; display: block; overflow: visible; }
</style>`

/**
 * Inline an SVG in a shadow root so currentColor follows the stage
 * and each icon's CSS animation stays scoped.
 */
export function KitSvg({
  src,
  alt,
  className,
  layout = 'fill',
}: {
  src: string
  alt: string
  className?: string
  layout?: 'fill' | 'intrinsic'
}) {
  const hostRef = useRef<HTMLSpanElement>(null)
  const { text, error } = useSvgSource(src)

  useEffect(() => {
    const host = hostRef.current
    if (!host || !text) return
    const root = host.shadowRoot ?? host.attachShadow({ mode: 'open' })
    root.innerHTML = `${SHADOW_STYLE}${text}`
  }, [text])

  if (error) {
    return <img src={src} alt={alt} className={className} />
  }

  const classes = className ? `kit-svg ${className}` : 'kit-svg'
  return (
    <span
      ref={hostRef}
      className={classes}
      data-layout={layout}
      role={alt ? 'img' : undefined}
      aria-label={alt || undefined}
      aria-hidden={alt ? undefined : true}
    />
  )
}
