export type KitStage = 'dark' | 'light' | 'checker'

export const KIT_STAGES: KitStage[] = ['dark', 'light', 'checker']

export const KIT_STAGE_KEY = 'fx-lab.svg-kits-bg'

export const KIT_STAGE_LABEL: Record<KitStage, { zh: string; en: string }> = {
  dark: { zh: '深色', en: 'Dark' },
  light: { zh: '浅色', en: 'Light' },
  checker: { zh: '透明', en: 'Alpha' },
}

export function isKitStage(value: string | null): value is KitStage {
  return value === 'dark' || value === 'light' || value === 'checker'
}

export function readStoredKitStage(): KitStage | null {
  try {
    const value = localStorage.getItem(KIT_STAGE_KEY)
    return isKitStage(value) ? value : null
  } catch {
    return null
  }
}

export function writeStoredKitStage(bg: KitStage) {
  try {
    localStorage.setItem(KIT_STAGE_KEY, bg)
  } catch {
    /* private mode or blocked storage */
  }
}

/** Light ink on a dark stage, dark ink on light and checker, so currentColor stays readable. */
export function stageDefaultStroke(bg: KitStage): string {
  return bg === 'dark' ? '#f4f5f8' : '#1c1d24'
}

export function isStageDefaultStroke(value: string): boolean {
  const color = value.toLowerCase()
  return color === '#f4f5f8' || color === '#1c1d24'
}

export const KIT_STROKE_KEY = 'fx-lab.svg-kits-stroke'

export function normalizeStroke(value: string | null): string | null {
  if (!value) return null
  const raw = value.trim()
  const match = raw.match(/^#?([0-9a-fA-F]{6})$/) ?? raw.match(/^#?([0-9a-fA-F]{3})$/)
  if (!match) return null
  const hex = match[1].length === 3 ? [...match[1]].map((c) => c + c).join('') : match[1]
  return `#${hex.toLowerCase()}`
}

export function readStoredKitStroke(): string | null {
  try {
    return normalizeStroke(localStorage.getItem(KIT_STROKE_KEY))
  } catch {
    return null
  }
}

export function writeStoredKitStroke(stroke: string) {
  try {
    localStorage.setItem(KIT_STROKE_KEY, stroke)
  } catch {
    /* private mode or blocked storage */
  }
}

/** URL stroke wins. A stored custom color wins over the stage default. Stage defaults follow the background so a dark grid stays light. */
export function resolveKitStroke(bg: KitStage, urlValue: string | null, storedValue: string | null): string {
  const fromUrl = normalizeStroke(urlValue)
  if (fromUrl) return fromUrl
  const stored = normalizeStroke(storedValue)
  if (stored && !isStageDefaultStroke(stored)) return stored
  return stageDefaultStroke(bg)
}
