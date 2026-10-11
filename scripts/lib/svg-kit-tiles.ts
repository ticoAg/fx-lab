/**
 * Opaque sticker plates baked into the pastoral / line-basics / druid / forest kits:
 * a 76×76 rounded rect (x=2 y=2 rx=14) plus a full-sheet backplate.
 * Primary ink is rewritten to currentColor so strokes follow the page stage.
 * healing is not generated; callers skip that id when the directory is absent.
 */

export const TILE_FILLS = ['#F5EFDC', '#FFF8EC', '#F6F0DC', '#FFFBF5'] as const
export const TILE_STROKES = ['#D8CDAE', '#E6D9C2', '#CDBF94', '#E8E0D4'] as const

/** Full-canvas sheet backplates used by the kits above. Not used by basics / cthulhu. */
export const SHEET_BACKPLATES = ['#F7F1E3', '#F7F3EC', '#E4E8D5', '#22372A'] as const

/** Primary ink (stroke and matching fill). Accent colors stay. */
export const INK_COLORS: Record<string, readonly string[]> = {
  pastoral: ['#5C4633'],
  'line-basics': ['#2C2C2C'],
  druid: ['#5E7D3A', '#4A3B28', '#7A5232'],
  forest: ['#2E3326'],
}

const RECT_RE = /<rect\b[\s\S]*?(?:\/>|><\/rect>)/gi

function attr(tag: string, name: string): string | null {
  const m = tag.match(new RegExp(`\\b${name}\\s*=\\s*"([^"]*)"`, 'i'))
  return m ? m[1] : null
}

function num(value: string | null): number | null {
  if (value == null || value.trim() === '') return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

function sameColor(a: string, b: string) {
  return a.toLowerCase() === b.toLowerCase()
}

function inList(value: string | null, list: readonly string[]) {
  return value != null && list.some((c) => sameColor(value, c))
}

export function viewBoxSize(svg: string): { w: number; h: number } | null {
  const m = svg.match(/viewBox\s*=\s*"([^"]+)"/i)
  if (!m) return null
  const parts = m[1].trim().split(/[\s,]+/).map(Number)
  if (parts.length !== 4 || parts.some((n) => !Number.isFinite(n))) return null
  return { w: parts[2], h: parts[3] }
}

/** Why this rect is an opaque plate, or null when it is part of the drawing. */
export function opaquePlateReason(tag: string, vb: { w: number; h: number } | null): string | null {
  if (!/^<rect\b/i.test(tag)) return null
  const fill = attr(tag, 'fill')
  const stroke = attr(tag, 'stroke')
  if (inList(fill, TILE_FILLS)) return `tile fill ${fill}`
  if (inList(stroke, TILE_STROKES)) return `tile stroke ${stroke}`
  if (!inList(fill, SHEET_BACKPLATES) || !vb || vb.w <= 0 || vb.h <= 0) return null
  const w = num(attr(tag, 'width'))
  const h = num(attr(tag, 'height'))
  if (w == null || h == null) return null
  if (w >= vb.w * 0.9 && h >= vb.h * 0.9) return `sheet backplate ${fill}`
  return null
}

export function plateProblems(svg: string): string[] {
  const vb = viewBoxSize(svg)
  const problems: string[] = []
  for (const tag of svg.match(RECT_RE) ?? []) {
    const reason = opaquePlateReason(tag, vb)
    if (reason) problems.push(reason)
  }
  return problems
}

export function inkLeft(svg: string, themeId: string): string[] {
  const left: string[] = []
  for (const color of INK_COLORS[themeId] ?? []) {
    const re = new RegExp(`(?:stroke|fill)\\s*=\\s*"${color}"|(?:stroke|fill)\\s*:\\s*${color}\\b`, 'i')
    if (re.test(svg)) left.push(color)
  }
  return left
}

export function stripSvgKitMarkup(svg: string, themeId: string): string {
  const vb = viewBoxSize(svg)
  let out = svg.replace(RECT_RE, (tag) => (opaquePlateReason(tag, vb) ? '' : tag))
  for (const color of INK_COLORS[themeId] ?? []) {
    const hex = color.replace(/#/g, '\\#')
    out = out.replace(new RegExp(`(stroke|fill)(\\s*=\\s*")${hex}(")`, 'gi'), '$1$2currentColor$3')
    out = out.replace(new RegExp(`(stroke|fill)(\\s*:\\s*)${hex}\\b`, 'gi'), '$1$2currentColor')
  }
  return out
}
