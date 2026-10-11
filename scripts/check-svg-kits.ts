/**
 * Validates seed SVG kits (bootstrap data only).
 * Future kits are uploaded via /svg-kits/admin and live in R2 / .data, not git.
 * Fails on: missing files, orphan files, duplicate ids, missing zh/en, bad cover/category.
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { validateTheme, type SvgKitTheme } from '../functions/_lib/model.ts'
import { inkLeft, plateProblems } from './lib/svg-kit-tiles.ts'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const seedDir = join(root, 'seed', 'svg-kits')
const errors: string[] = []
const err = (m: string) => errors.push(m)

if (!existsSync(join(seedDir, 'index.json'))) {
  err('missing seed/svg-kits/index.json')
}

const index = existsSync(join(seedDir, 'index.json'))
  ? (JSON.parse(readFileSync(join(seedDir, 'index.json'), 'utf8')) as { themes?: string[] })
  : { themes: [] }
const themeIds = new Set<string>()
let iconTotal = 0

for (const id of index.themes ?? []) {
  const tw = `seed theme "${id}"`
  if (themeIds.has(id)) err(`${tw}: duplicate id in index.json`)
  themeIds.add(id)
  const themeDir = join(seedDir, id)
  const manifestPath = join(themeDir, 'manifest.json')
  if (!existsSync(manifestPath)) {
    err(`${tw}: missing manifest.json`)
    continue
  }
  const raw = JSON.parse(readFileSync(manifestPath, 'utf8')) as unknown
  const checked = validateTheme(raw)
  if (!checked.theme) {
    for (const e of checked.errors) err(`${tw}: ${e}`)
    continue
  }
  const theme: SvgKitTheme = checked.theme
  if (theme.id !== id) err(`${tw}: manifest id "${theme.id}" does not match folder`)
  const iconsDir = join(themeDir, 'icons')
  if (!existsSync(iconsDir)) {
    err(`${tw}: missing icons/`)
    continue
  }
  for (const icon of theme.icons) {
    iconTotal++
    const path = join(iconsDir, `${icon.id}.svg`)
    if (!existsSync(path)) err(`${tw} icon "${icon.id}": file not found`)
    else {
      const svg = readFileSync(path, 'utf8')
      if (!svg.includes('<svg')) err(`${tw} icon "${icon.id}": not an SVG file`)
      for (const problem of plateProblems(svg)) err(`${tw} icon "${icon.id}": opaque plate (${problem})`)
      for (const color of inkLeft(svg, id)) {
        err(`${tw} icon "${icon.id}": ink ${color} should be currentColor`)
      }
    }
  }
  if (theme.sheet) {
    const sheetPath = join(themeDir, theme.sheet)
    if (!existsSync(sheetPath)) err(`${tw}: missing sheet ${theme.sheet}`)
    else {
      const sheet = readFileSync(sheetPath, 'utf8')
      if (!sheet.includes('<svg')) err(`${tw}: sheet is not SVG`)
      for (const problem of plateProblems(sheet)) err(`${tw}: sheet opaque plate (${problem})`)
      for (const color of inkLeft(sheet, id)) err(`${tw}: sheet ink ${color} should be currentColor`)
    }
  }
  for (const f of readdirSync(iconsDir)) {
    if (!f.endsWith('.svg')) err(`${tw}: unexpected non-SVG file icons/${f}`)
    else if (!theme.icons.some((i) => i.id === f.slice(0, -4))) err(`${tw}: orphan file icons/${f}`)
  }
  const allowedTop = new Set(['icons', 'manifest.json', ...(theme.sheet ? [theme.sheet] : [])])
  for (const f of readdirSync(themeDir)) {
    if (!allowedTop.has(f)) err(`${tw}: orphan file ${f}`)
  }
}

if (existsSync(seedDir)) {
  for (const d of readdirSync(seedDir)) {
    if (d === 'index.json') continue
    const path = join(seedDir, d)
    if (statSync(path).isDirectory() && !themeIds.has(d)) err(`orphan seed folder ${d}`)
    if (statSync(path).isFile() && d !== 'index.json') err(`orphan seed file ${d}`)
  }
}

if (errors.length) {
  console.error(`✗ svg-kits check failed (${errors.length}):`)
  for (const e of errors) console.error(`  - ${e}`)
  process.exit(1)
}
console.log(`✓ svg-kits seed OK: ${themeIds.size} themes, ${iconTotal} icons`)
