/**
 * Build step for seed SVG kits: drop opaque rounded tile plates and retarget
 * primary ink to currentColor. Accent fills stay.
 *
 * The per-theme generators that originally called tile() are not in this repo.
 * Drop updated SVGs into seed/svg-kits and run:
 *
 *   npm run build:svg-kits
 *
 * healing was never generated. A missing seed/svg-kits/healing directory is skipped.
 */
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { stripSvgKitMarkup } from './lib/svg-kit-tiles.ts'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const seedDir = join(root, 'seed', 'svg-kits')

const DESCRIPTION_EDITS: Record<string, { zh: [string, string]; en: [string, string] }> = {
  pastoral: {
    zh: ['奶油亚麻色圆角底板上，用暖棕描边勾勒', '透明底上用随页面变色的描边勾勒'],
    en: [
      'warm brown strokes on a cream linen rounded tile, with',
      'strokes that follow the page color (currentColor), with',
    ],
  },
  'line-basics': {
    zh: ['在奶油白圆角底板上用深炭灰圆头描边勾勒，', '透明底上用随页面变色的圆头描边勾勒，'],
    en: [
      'dark charcoal round-cap strokes on a light cream rounded tile, with',
      'round-cap strokes that follow the page color (currentColor), with',
    ],
  },
  druid: {
    zh: [
      '奶油色暖调圆角底板上，用苔绿、树皮棕、叶绿、月光银白与柔金勾勒',
      '透明底上用随页面变色的主描边，并保留叶绿、月光银白与柔金，勾勒',
    ],
    en: [
      'drawn in moss green, bark brown, leaf green, moonlight silver-cream and soft gold over a warm cream rounded tile.',
      'drawn with strokes that follow the page color (currentColor), keeping leaf green, moonlight silver-cream and soft gold.',
    ],
  },
  forest: {
    zh: [
      '奶油色扁平圆角底板上，用森林绿、苔藓绿、树皮棕、蘑菇红与萤火黄绿的平涂色块和粗描边绘出',
      '透明底上，主描边跟随页面文字色，并用森林绿、苔藓绿、树皮棕、蘑菇红与萤火黄绿的平涂色块绘出',
    ],
    en: [
      'on a soft cream rounded tile — ',
      'on a transparent ground, with strokes that follow the page color (currentColor) — ',
    ],
  },
}

function walkSvgs(dir: string, out: string[]) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) walkSvgs(path, out)
    else if (name.endsWith('.svg')) out.push(path)
  }
}

const healingDir = join(seedDir, 'healing')
if (!existsSync(healingDir)) {
  console.log('skip healing: seed/svg-kits/healing is not in this repo')
} else {
  console.log('healing: present, stripping with the other themes')
}

const indexPath = join(seedDir, 'index.json')
const index = JSON.parse(readFileSync(indexPath, 'utf8')) as { themes?: string[] }
let svgCount = 0
let changed = 0

for (const id of index.themes ?? []) {
  const themeDir = join(seedDir, id)
  if (!existsSync(themeDir)) {
    console.log(`skip ${id}: directory missing`)
    continue
  }
  const svgs: string[] = []
  walkSvgs(themeDir, svgs)
  for (const path of svgs) {
    svgCount++
    const before = readFileSync(path, 'utf8')
    const after = stripSvgKitMarkup(before, id)
    if (after !== before) {
      writeFileSync(path, after)
      changed++
    }
  }
  const edit = DESCRIPTION_EDITS[id]
  const manifestPath = join(themeDir, 'manifest.json')
  if (edit && existsSync(manifestPath)) {
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as {
      description?: { zh?: string; en?: string }
    }
    const desc = manifest.description
    if (desc?.zh && desc.zh.includes(edit.zh[0])) desc.zh = desc.zh.replace(edit.zh[0], edit.zh[1])
    if (desc?.en && desc.en.includes(edit.en[0])) desc.en = desc.en.replace(edit.en[0], edit.en[1])
    writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`)
  }
}

console.log(`svg kits: ${svgCount} files, ${changed} rewritten`)
