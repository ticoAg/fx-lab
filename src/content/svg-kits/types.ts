import { ASSET_CDN } from '../../cdn.ts'
import type { SvgKitKind } from '../../../functions/_lib/model.ts'
import type { Lang, LocaleText } from '../../i18n.ts'

export type { Lang, LocaleText }
// Theme kinds and their per-file budgets are defined once, next to the server-side validation.
export { SVG_KIT_BUDGETS, SVG_KIT_KINDS, type SvgKitKind } from '../../../functions/_lib/model.ts'
export { validateSvgKitViews, type SvgKitViews } from '../../../functions/_lib/model.ts'

export type SvgAnimation = 'pop' | 'float' | 'spin' | 'pulse' | 'sway' | 'none'

export const SVG_ANIMATIONS: SvgAnimation[] = ['pop', 'float', 'spin', 'pulse', 'sway', 'none']

export function fileStemToId(name: string) {
  return name
    .replace(/\.svg$/i, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export type SvgKitIcon = {
  id: string
  title: LocaleText
  description: LocaleText
  animation: SvgAnimation
  category?: string
  tags?: string[]
}

export const SVG_KIT_KIND_LABELS: Record<SvgKitKind, LocaleText> = {
  icon: { zh: '轻量图标', en: 'Icons' },
  illustration: { zh: '精美插画', en: 'Illustrations' },
}

export type SvgKitTheme = {
  id: string
  title: LocaleText
  description: LocaleText
  kind?: SvgKitKind
  cover: string
  categories?: Record<string, LocaleText>
  icons: SvgKitIcon[]
}

export type SvgKitsStoreInfo = {
  backend: 'r2' | 'local' | 'seed'
  writable: boolean
}

export const SVG_KITS_API = '/api/svg-kits'
export const SVG_KITS_SEED = '/seed-svg-kits'

// Where a theme's files are read from: cdn (R2 via CDN, same key layout as R2KitStore in functions/api/svg-kits), seed (static build output), api (Pages Function).
export type SvgKitSource = 'cdn' | 'seed' | 'api'

// Themes from R2 and from the seed can sit side by side, so the source is tracked per theme.
const themeSources = new Map<string, SvgKitSource>()

export function setSvgKitSource(themeId: string, source: SvgKitSource) {
  themeSources.set(themeId, source)
}

export function iconUrl(themeId: string, iconId: string) {
  const source = themeSources.get(themeId) ?? 'api'
  if (source === 'cdn') return `${ASSET_CDN}/themes/${themeId}/icons/${iconId}.svg`
  if (source === 'seed') return `${SVG_KITS_SEED}/${themeId}/icons/${iconId}.svg`
  return `${SVG_KITS_API}/${themeId}/icons/${iconId}.svg`
}
