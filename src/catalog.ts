import type { DemoItem, SourceId } from './types.ts'
import { animeDemos } from './demos/anime/demos.tsx'
import { reactbitsDemos } from './demos/reactbits/catalog.ts'
import { threeuiDemos } from './demos/threeui/catalog.ts'
import { curveDemos } from './demos/curves/catalog.ts'

export const ALL_DEMOS: DemoItem[] = [
  ...animeDemos,
  ...reactbitsDemos,
  ...threeuiDemos,
  ...curveDemos,
]

export const SOURCES: { id: SourceId; label: string }[] = [
  { id: 'all', label: '全部' },
  { id: 'animejs', label: 'anime.js' },
  { id: 'react-bits', label: 'react-bits' },
  { id: 'threeui', label: 'ThreeUI' },
  { id: 'math-curve-loaders', label: 'math-curve-loaders' },
]

export function filterDemos(source: SourceId, q: string) {
  const query = q.trim().toLowerCase()
  return ALL_DEMOS.filter((d) => {
    if (source !== 'all' && d.source !== source) return false
    if (!query) return true
    return (
      d.name.toLowerCase().includes(query) ||
      d.zh.toLowerCase().includes(query) ||
      d.en.toLowerCase().includes(query) ||
      d.id.toLowerCase().includes(query)
    )
  })
}
