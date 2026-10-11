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
