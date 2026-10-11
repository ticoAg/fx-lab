import type { Lang, LocaleText } from '../../i18n.ts'

export type { Lang, LocaleText }

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

export type SvgKitTheme = {
  id: string
  title: LocaleText
  description: LocaleText
  cover: string
  sheet?: string
  categories?: Record<string, LocaleText>
  icons: SvgKitIcon[]
}

export type SvgKitsStoreInfo = {
  backend: 'r2' | 'local' | 'seed'
  writable: boolean
}

export const SVG_KITS_API = '/api/svg-kits'
export const SVG_KITS_SEED = '/seed-svg-kits'

let assetMode: 'api' | 'seed' = 'api'

export function setSvgKitAssetMode(mode: 'api' | 'seed') {
  assetMode = mode
}

export function iconUrl(themeId: string, iconId: string) {
  if (assetMode === 'seed') return `${SVG_KITS_SEED}/${themeId}/icons/${iconId}.svg`
  return `${SVG_KITS_API}/${themeId}/icons/${iconId}.svg`
}

export function sheetUrl(theme: SvgKitTheme) {
  if (!theme.sheet) return null
  if (assetMode === 'seed') return `${SVG_KITS_SEED}/${theme.id}/${theme.sheet}`
  return `${SVG_KITS_API}/${theme.id}/sheet`
}
