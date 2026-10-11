/**
 * Repair overview sheets whose nested <svg> tiles lack width/height.
 * Without those presentation attributes, browsers pile every tile on top of
 * each other (CSS width/height alone is not enough for nested SVG viewports).
 *
 * Download + rewrite locally:
 *   node --import tsx scripts/fix-svg-kit-sheet-viewports.ts --theme ui-micro-states
 *
 * Upload to R2 (requires wrangler login):
 *   node --import tsx scripts/fix-svg-kit-sheet-viewports.ts --theme ui-micro-states --upload
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'

const ASSET_CDN = 'https://fx-lab-cdn.ticoag.fun'
const API = 'https://fx-lab-5do.pages.dev/api/svg-kits'
const BUCKET = 'fx-lab-svg-kits'

function parseArgs(argv: string[]) {
  const themes: string[] = []
  let upload = false
  let allBroken = false
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--upload') upload = true
    else if (a === '--all-broken') allBroken = true
    else if (a === '--theme') themes.push(argv[++i]!)
    else if (a.startsWith('--theme=')) themes.push(a.slice('--theme='.length))
  }
  return { themes, upload, allBroken }
}

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
    const cleaned = attrs.replace(/\sstyle="([^"]*)"/, (_m, style: string) => {
      const next = style
        .replace(/;?\s*width:\s*[\d.]+px/g, '')
        .replace(/;?\s*height:\s*[\d.]+px/g, '')
        .replace(/^;+|;+$/g, '')
        .trim()
      return next ? ` style="${next}"` : ''
    })
    return `<svg${cleaned} width="${width}" height="${height}">`
  })
}

async function fetchSheet(themeId: string) {
  for (const url of [`${ASSET_CDN}/themes/${themeId}/sheet.svg`, `${API}/${themeId}/sheet`]) {
    const res = await fetch(url)
    if (res.ok) return await res.text()
  }
  throw new Error(`sheet not found for ${themeId}`)
}

async function listBrokenThemes() {
  const res = await fetch(API)
  if (!res.ok) throw new Error(`list failed: ${res.status}`)
  const data = (await res.json()) as { themes?: { id: string; sheet?: string }[] }
  const ids = (data.themes ?? []).filter((t) => t.sheet).map((t) => t.id)
  const broken: string[] = []
  for (const id of ids) {
    try {
      const sheet = await fetchSheet(id)
      const nested = [...sheet.matchAll(/<svg\b([^>]*)>/g)].slice(1)
      if (nested.some((m) => !/\bwidth\s*=/.test(m[1]!))) broken.push(id)
    } catch {
      /* no sheet */
    }
  }
  return broken
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const themes = args.allBroken ? await listBrokenThemes() : args.themes
  if (!themes.length) {
    console.error('Usage: --theme <id> [--upload]  or  --all-broken [--upload]')
    process.exit(1)
  }
  const outDir = join(process.cwd(), '.data', 'svg-kit-sheet-fixes')
  mkdirSync(outDir, { recursive: true })
  for (const themeId of themes) {
    const raw = await fetchSheet(themeId)
    const fixed = ensureNestedSvgViewports(raw)
    const path = join(outDir, `${themeId}.svg`)
    writeFileSync(path, fixed)
    const nested = [...fixed.matchAll(/<svg\b([^>]*)>/g)].slice(1)
    const withWidth = nested.filter((m) => /\bwidth\s*=/.test(m[1]!)).length
    console.log(`✓ ${themeId}: ${nested.length} tiles, ${withWidth} with width → ${path}`)
    if (args.upload) {
      const put = spawnSync(
        'npx',
        [
          'wrangler',
          'r2',
          'object',
          'put',
          `${BUCKET}/themes/${themeId}/sheet.svg`,
          '--file',
          path,
          '--content-type',
          'image/svg+xml',
          '--remote',
        ],
        { stdio: 'inherit' },
      )
      if (put.status !== 0) process.exit(put.status ?? 1)
    }
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
