// Static contract for one theme directory (manifest.json + icons/). Run from the fx-lab repo root:
//   npx tsx .agents/skills/svg-kit-assets/scripts/validate-static.mts <themeDir> [--original <dir>]
// --original enables refinement rules: existing ids/order/title/category/animation/tags, cover, kind
// and existing categories stay; every existing SVG is actually redrawn (no reused path d > 40 chars).
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

type SvgKitTheme = {
  id: string
  kind?: 'icon' | 'illustration'
  cover: string
  categories?: Record<string, unknown>
  icons: { id: string; title: unknown; category?: string; animation: string; tags?: string[] }[]
}
const repo = process.cwd()
const repoModule = (p: string) => {
  if (!existsSync(join(repo, p))) throw new Error(`run from the fx-lab repo root (missing ${p})`)
  return import(pathToFileURL(join(repo, p)).href)
}
const { budgetProblem, validateTheme } = await repoModule('functions/_lib/model.ts')
const { inkLeft, plateProblems } = (await repoModule('scripts/lib/svg-kit-tiles.ts')) as {
  inkLeft: (svg: string, id: string) => string[]
  plateProblems: (svg: string) => string[]
}

const args = process.argv.slice(2)
const dir = resolve(args[0] ?? '')
const oi = args.indexOf('--original')
const originalDir = oi >= 0 ? resolve(args[oi + 1]) : null
const errors: string[] = []
const warnings: string[] = []
const fail = (m: string) => errors.push(m)

const readTheme = (d: string) => {
  const raw = JSON.parse(readFileSync(join(d, 'manifest.json'), 'utf8'))
  return (Array.isArray(raw.icons) ? raw : raw.theme) as SvgKitTheme & { sheet?: string }
}
const raw = readTheme(dir)
const checked = validateTheme(raw)
if (!checked.theme) {
  console.error(`✗ manifest invalid:\n  - ${checked.errors.join('\n  - ')}`)
  process.exit(1)
}
const theme = checked.theme
const kind = theme.kind ?? 'icon'
const soft = kind === 'icon' ? { bytes: 20 * 1024, elements: 180 } : { bytes: 120 * 1024, elements: 2000 }

const files = readdirSync(join(dir, 'icons')).filter((f) => f.endsWith('.svg')).sort()
const expected = theme.icons.map((i) => `${i.id}.svg`).sort()
if (JSON.stringify(files) !== JSON.stringify(expected)) fail(`icons/ does not match manifest (orphans or missing files)`)

const original = originalDir ? readTheme(originalDir) : null
const byOld = new Map(original?.icons.map((i) => [i.id, i]) ?? [])
if (original) {
  const oldIds = original.icons.map((i) => i.id)
  if (JSON.stringify(theme.icons.slice(0, oldIds.length).map((i) => i.id)) !== JSON.stringify(oldIds)) fail('existing icon ids or order changed')
  if (theme.cover !== original.cover) fail('cover changed')
  if ((original.kind ?? 'icon') !== kind) fail('kind changed')
  if ((raw.sheet ?? null) !== ((original as { sheet?: string }).sheet ?? null)) fail('sheet changed')
  for (const [k, v] of Object.entries(original.categories ?? {})) {
    if (JSON.stringify(theme.categories?.[k]) !== JSON.stringify(v)) fail(`existing category "${k}" renamed or removed`)
  }
}

const seenIds = new Set<string>()
const seenFrames = new Set<string>()
const paths = (svg: string) => [...svg.matchAll(/\sd="([^"]+)"/g)].map((m) => m[1])
let maxBytes = 0
let maxElements = 0

for (const icon of theme.icons) {
  const at = `${icon.id}`
  const prefix = `${theme.id}-${icon.id}-`
  const file = join(dir, 'icons', `${icon.id}.svg`)
  if (!existsSync(file)) continue
  const svg = readFileSync(file, 'utf8')
  const bytes = Buffer.byteLength(svg)
  const elements = svg.match(/<[a-zA-Z]/g)?.length ?? 0
  maxBytes = Math.max(maxBytes, bytes)
  maxElements = Math.max(maxElements, elements)
  const over = budgetProblem(theme.kind, svg)
  if (over) fail(`${at}: over budget (${over})`)
  else if (bytes > soft.bytes || elements > soft.elements) warnings.push(`${at}: above soft target (${bytes} B, ${elements} elements)`)
  try {
    execFileSync('xmllint', ['--nonet', '--noout', file], { stdio: 'pipe' })
  } catch {
    fail(`${at}: not well-formed XML`)
  }

  const old = byOld.get(icon.id)
  const viewBox = svg.match(/\bviewBox="([^"]+)"/)?.[1]
  if (old) {
    const prev = readFileSync(join(originalDir!, 'icons', `${icon.id}.svg`), 'utf8')
    const prevBox = prev.match(/\bviewBox="([^"]+)"/)?.[1]
    if (viewBox !== prevBox && viewBox !== '0 0 80 80') fail(`${at}: viewBox ${viewBox}`)
    for (const k of ['title', 'category', 'animation'] as const) {
      if (JSON.stringify(icon[k] ?? null) !== JSON.stringify(old[k] ?? null)) fail(`${at}: ${k} changed`)
    }
    const lost = (old.tags ?? []).filter((t) => !(icon.tags ?? []).includes(t))
    if (lost.length) fail(`${at}: removed tags ${lost.join(', ')}`)
    const prevPaths = new Set(paths(prev).filter((d) => d.length > 40))
    if (paths(svg).some((d) => prevPaths.has(d))) fail(`${at}: reuses original path data, redraw it`)
  } else if (viewBox !== '0 0 80 80') fail(`${at}: viewBox must be 0 0 80 80`)

  if (/<!DOCTYPE|<!ENTITY|<script\b|<foreignObject\b|<image\b|<text\b|\son[a-z]+\s*=/i.test(svg)) fail(`${at}: forbidden markup (script/foreignObject/image/text/DOCTYPE/on*)`)
  for (const m of svg.matchAll(/(?:href|xlink:href)="([^"]+)"|url\(\s*["']?([^)"'\s]+)/g)) {
    if (!(m[1] ?? m[2]).startsWith('#')) fail(`${at}: external reference ${m[1] ?? m[2]}`)
  }
  if (/@import|@font-face/.test(svg)) fail(`${at}: @import or @font-face`)
  if (!/stroke="currentColor"|stroke:\s*currentColor/.test(svg)) fail(`${at}: no currentColor outline`)
  for (const m of svg.matchAll(/<(\w+)\b([^>]*?)\b(?:fill|stop-color)="currentColor"/g)) {
    const r = Number(m[2].match(/\br="([\d.]+)"/)?.[1] ?? 99)
    if (!(m[1] === 'circle' && r <= 2)) fail(`${at}: large currentColor fill on <${m[1]}>`)
  }
  for (const p of plateProblems(svg)) fail(`${at}: opaque plate (${p})`)
  for (const c of inkLeft(svg, theme.id)) fail(`${at}: ink ${c} should be currentColor`)

  const ids = [...svg.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1])
  if (new Set(ids).size !== ids.length) fail(`${at}: duplicate ids`)
  for (const id of ids) {
    if (!id.startsWith(prefix)) fail(`${at}: id "${id}" lacks prefix ${prefix}`)
    if (seenIds.has(id)) fail(`${at}: id "${id}" collides with another icon`)
    seenIds.add(id)
  }
  for (const m of svg.matchAll(/url\(#([^)]+)\)|href="#([^"]+)"/g)) {
    if (!ids.includes(m[1] ?? m[2])) fail(`${at}: unresolved reference #${m[1] ?? m[2]}`)
  }
  for (const m of svg.matchAll(/\bclass="([^"]+)"/g)) {
    for (const c of m[1].split(/\s+/)) if (!c.startsWith(prefix)) fail(`${at}: class "${c}" lacks prefix`)
  }

  const css = [...svg.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map((m) => m[1]).join('')
  const frames = [...css.matchAll(/@(?:-webkit-)?keyframes\s+([\w-]+)/g)].map((m) => m[1])
  const animated = icon.animation !== 'none'
  if (frames.length !== (animated ? 1 : 0)) fail(`${at}: ${frames.length} @keyframes for animation "${icon.animation}"`)
  for (const f of frames) {
    if (!f.startsWith(prefix)) fail(`${at}: keyframes "${f}" lacks prefix`)
    if (seenFrames.has(f)) fail(`${at}: keyframes "${f}" collides`)
    seenFrames.add(f)
  }
  if (animated) {
    if (!css.includes('animation-play-state:inherit')) fail(`${at}: missing animation-play-state:inherit chain`)
    if (!css.includes('prefers-reduced-motion')) fail(`${at}: missing prefers-reduced-motion`)
    if (!svg.includes(`class="${prefix}motion"`)) fail(`${at}: no element with class ${prefix}motion`)
  }
  // The detail view inlines the SVG into the page, so every selector must be scoped to this icon.
  const rules = css
    .replace(/@(?:-webkit-)?keyframes\s+[\w-]+\s*\{(?:[^{}]*\{[^{}]*\})*[^{}]*\}/g, '')
    .replace(/@media[^{]*\{/g, '')
  for (const m of rules.matchAll(/([^{}]+)\{/g)) {
    for (const sel of m[1].split(',').map((s) => s.trim()).filter(Boolean)) {
      if (!sel.startsWith(`#${prefix}`) && !sel.startsWith(`.${prefix}`)) fail(`${at}: unscoped CSS selector "${sel}"`)
    }
  }
}

for (const w of warnings) console.warn(`! ${w}`)
if (errors.length) {
  console.error(`✗ ${theme.id}: ${errors.length} problems\n  - ${errors.join('\n  - ')}`)
  process.exit(1)
}
const added = original ? theme.icons.length - original.icons.length : theme.icons.length
console.log(`✓ ${theme.id}: ${theme.icons.length} icons (${added} new), kind ${kind}, max ${maxBytes} B / ${maxElements} elements`)
