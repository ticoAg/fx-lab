/**
 * Nested <svg> tiles inside overview sheets need width/height presentation
 * attributes. CSS width/height (and style="") alone do not size nested SVG
 * viewports when the sheet is inlined or shown as <img>, so tiles collapse
 * onto each other. Derive missing sizes from viewBox.
 */
export function ensureNestedSvgViewports(svgText: string): string {
  let root = true
  return svgText.replace(/<svg\b([^>]*)>/g, (full, attrs: string) => {
    if (root) {
      root = false
      return full
    }
    if (/\bwidth\s*=/.test(attrs)) return full
    const viewBox = attrs.match(/viewBox\s*=\s*"([^"]*)"/i)?.[1]
    if (!viewBox) return full
    const parts = viewBox.trim().split(/[\s,]+/)
    if (parts.length !== 4) return full
    const [, , width, height] = parts
    if (!width || !height) return full
    return `<svg${attrs} width="${width}" height="${height}">`
  })
}
