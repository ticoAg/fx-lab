import type { DemoItem } from '../../types.ts'
import { curves } from './official.js'

export const officialCurves = curves as Array<Record<string, unknown> & {
  name: string
  tag: string
  descriptionZh: string
  descriptionEn: string
  point: (...args: unknown[]) => { x: number; y: number }
}>

export const curveDemos: DemoItem[] = officialCurves.map((curve) => {
  const pointSrc = curve.point.toString()
  const keys = [
    'particleCount',
    'trailSpan',
    'durationMs',
    'pulseDurationMs',
    'rotationDurationMs',
    'strokeWidth',
    'rotate',
  ]
  const params = keys
    .filter((k) => k in curve)
    .map((k) => `  ${k}: ${JSON.stringify(curve[k])},`)
    .join('\n')
  return {
    id: `curve-${curve.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
    source: 'math-curve-loaders',
    name: curve.name,
    zh: curve.descriptionZh,
    en: curve.descriptionEn,
    webgl: false,
    code: `// official math-curve-loaders · ${curve.name}\n// ${curve.tag}\nconst config = {\n  name: ${JSON.stringify(curve.name)},\n${params}\n  point(progress, detailScale, config) ${pointSrc.slice(pointSrc.indexOf('{'))}\n}\n`,
  }
})
