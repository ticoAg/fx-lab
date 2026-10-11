export type LocaleText = { zh: string; en: string }

export type SvgAnimation = 'pop' | 'float' | 'spin' | 'pulse' | 'sway' | 'none'

export const SVG_ANIMATIONS: SvgAnimation[] = ['pop', 'float', 'spin', 'pulse', 'sway', 'none']

export type SvgKitIcon = {
  id: string
  title: LocaleText
  description: LocaleText
  animation: SvgAnimation
  category?: string
  tags?: string[]
}

// icon: small UI icons, light files. illustration: detailed artwork, larger files allowed.
// Missing means icon.
export type SvgKitKind = 'icon' | 'illustration'

export const SVG_KIT_KINDS: SvgKitKind[] = ['icon', 'illustration']

// Per-file limits for each kind: bytes and element count (opening tags).
export const SVG_KIT_BUDGETS: Record<SvgKitKind, { bytes: number; elements: number }> = {
  icon: { bytes: 24 * 1024, elements: 200 },
  illustration: { bytes: 160 * 1024, elements: 2500 },
}

// Returns a problem message when an SVG file goes over its theme kind's budget.
export function budgetProblem(kind: SvgKitKind | undefined, svg: string) {
  const budget = SVG_KIT_BUDGETS[kind ?? 'icon']
  const bytes = new TextEncoder().encode(svg).byteLength
  const elements = svg.match(/<[a-zA-Z]/g)?.length ?? 0
  if (bytes <= budget.bytes && elements <= budget.elements) return null
  return `${Math.ceil(bytes / 1024)} KB, ${elements} elements; ${kind ?? 'icon'} limit is ${budget.bytes / 1024} KB, ${budget.elements} elements`
}

export type SvgKitTheme = {
  id: string
  title: LocaleText
  description: LocaleText
  kind?: SvgKitKind
  cover: string
  sheet?: string
  categories?: Record<string, LocaleText>
  icons: SvgKitIcon[]
}

export type StoreInfo = {
  backend: 'r2' | 'local' | 'seed'
  writable: boolean
}

export const KIT_ID_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export function fileStemToId(name: string) {
  return name
    .replace(/\.svg$/i, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function checkText(where: string, text: unknown, errors: string[]) {
  if (!text || typeof text !== 'object') {
    errors.push(`${where}: missing zh/en`)
    return
  }
  const rec = text as Record<string, unknown>
  for (const lang of ['zh', 'en'] as const) {
    if (typeof rec[lang] !== 'string' || !rec[lang].trim()) errors.push(`${where}: missing ${lang}`)
  }
}

export function isSvgMarkup(text: string) {
  return text.includes('<svg')
}

export function validateTheme(input: unknown): { theme?: SvgKitTheme; errors: string[] } {
  const errors: string[] = []
  if (!input || typeof input !== 'object') return { errors: ['theme must be an object'] }
  const raw = input as Record<string, unknown>
  if (typeof raw.id !== 'string' || !KIT_ID_RE.test(raw.id)) errors.push('theme id must be kebab-case')
  checkText('title', raw.title, errors)
  checkText('description', raw.description, errors)
  if (raw.kind != null && !SVG_KIT_KINDS.includes(raw.kind as SvgKitKind)) {
    errors.push(`kind must be one of ${SVG_KIT_KINDS.join(', ')}`)
  }
  if (typeof raw.cover !== 'string' || !raw.cover) errors.push('cover is required')
  if (raw.sheet != null && (typeof raw.sheet !== 'string' || !raw.sheet.endsWith('.svg'))) {
    errors.push('sheet must be an .svg filename')
  }

  const categories: Record<string, LocaleText> = {}
  if (raw.categories != null) {
    if (typeof raw.categories !== 'object' || Array.isArray(raw.categories)) {
      errors.push('categories must be an object')
    } else {
      for (const [key, label] of Object.entries(raw.categories as Record<string, unknown>)) {
        if (!KIT_ID_RE.test(key)) errors.push(`category "${key}": id must be kebab-case`)
        checkText(`category "${key}"`, label, errors)
        if (label && typeof label === 'object') categories[key] = label as LocaleText
      }
    }
  }

  if (!Array.isArray(raw.icons) || raw.icons.length === 0) errors.push('theme needs at least one icon')
  const icons: SvgKitIcon[] = []
  const seen = new Set<string>()
  for (const item of Array.isArray(raw.icons) ? raw.icons : []) {
    if (!item || typeof item !== 'object') {
      errors.push('icon entry is not an object')
      continue
    }
    const icon = item as Record<string, unknown>
    const id = typeof icon.id === 'string' ? icon.id : ''
    const where = `icon "${id || '?'}"`
    if (!KIT_ID_RE.test(id)) errors.push(`${where}: id must be kebab-case`)
    if (seen.has(id)) errors.push(`${where}: duplicate id`)
    seen.add(id)
    checkText(`${where} title`, icon.title, errors)
    checkText(`${where} description`, icon.description, errors)
    const animation = icon.animation
    if (typeof animation !== 'string' || !SVG_ANIMATIONS.includes(animation as SvgAnimation)) {
      errors.push(`${where}: animation must be one of ${SVG_ANIMATIONS.join(', ')}`)
    }
    if (icon.category != null) {
      if (typeof icon.category !== 'string') errors.push(`${where}: category must be a string`)
      else if (!categories[icon.category]) errors.push(`${where}: unknown category "${icon.category}"`)
    }
    icons.push({
      id,
      title: (icon.title as LocaleText) ?? { zh: '', en: '' },
      description: (icon.description as LocaleText) ?? { zh: '', en: '' },
      animation: (typeof animation === 'string' ? animation : 'none') as SvgAnimation,
      ...(typeof icon.category === 'string' ? { category: icon.category } : {}),
      ...(Array.isArray(icon.tags) ? { tags: icon.tags.filter((t) => typeof t === 'string') as string[] } : {}),
    })
  }

  if (typeof raw.cover === 'string' && raw.cover && !seen.has(raw.cover)) {
    errors.push(`cover "${raw.cover}" is not a registered icon`)
  }

  if (errors.length) return { errors }
  return {
    theme: {
      id: raw.id as string,
      title: raw.title as LocaleText,
      description: raw.description as LocaleText,
      ...(raw.kind === 'illustration' ? { kind: 'illustration' as const } : {}),
      cover: raw.cover as string,
      ...(typeof raw.sheet === 'string' ? { sheet: raw.sheet } : {}),
      ...(Object.keys(categories).length ? { categories } : {}),
      icons,
    },
    errors,
  }
}
