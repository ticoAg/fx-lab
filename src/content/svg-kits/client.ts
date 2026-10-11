import { ASSET_CDN } from '../../cdn.ts'
import { setSvgKitSource, SVG_KITS_API, SVG_KITS_SEED, type SvgKitsStoreInfo, type SvgKitTheme } from './types.ts'

export type SvgKitsListResponse = {
  store: SvgKitsStoreInfo
  themes: SvgKitTheme[]
}

const TOKEN_KEY = 'fx-lab.svg-kits-token'

export function readAdminToken() {
  try {
    return sessionStorage.getItem(TOKEN_KEY) || ''
  } catch {
    return ''
  }
}

export function writeAdminToken(token: string) {
  try {
    if (token) sessionStorage.setItem(TOKEN_KEY, token)
    else sessionStorage.removeItem(TOKEN_KEY)
  } catch {
    /* ignore */
  }
}

async function readThemes(indexUrl: string, manifestUrl: (id: string) => string) {
  const res = await fetch(indexUrl)
  if (!res.ok) throw new Error(`${indexUrl}: ${res.status}`)
  const data = (await res.json()) as { themes?: string[] }
  const items = await Promise.all(
    (data.themes ?? []).map(async (id) => {
      const item = await fetch(manifestUrl(id))
      return item.ok ? ((await item.json()) as SvgKitTheme) : null
    }),
  )
  return items.filter((theme): theme is SvgKitTheme => theme !== null)
}

const seedManifestUrl = (id: string) => `${SVG_KITS_SEED}/${id}/manifest.json`
const cdnManifestUrl = (id: string) => `${ASSET_CDN}/themes/${id}/manifest.json`

async function loadSeedFallback(): Promise<SvgKitsListResponse> {
  const themes = await readThemes(`${SVG_KITS_SEED}/index.json`, seedManifestUrl).catch(() => {
    throw new Error('SVG Kits store unavailable')
  })
  for (const theme of themes) setSvgKitSource(theme.id, 'seed')
  return { store: { backend: 'seed', writable: false }, themes }
}

// Production browsing path: R2 through the CDN plus the static seed, merged like overlayStore in
// functions/_lib/http.ts (an R2 theme replaces the seed theme with the same id). No Pages Functions calls.
async function loadFromCdn(): Promise<SvgKitsListResponse> {
  const [seedThemes, liveThemes] = await Promise.all([
    readThemes(`${SVG_KITS_SEED}/index.json`, seedManifestUrl).catch(() => []),
    readThemes(`${ASSET_CDN}/index.json`, cdnManifestUrl),
  ])
  const map = new Map<string, SvgKitTheme>()
  for (const theme of seedThemes) {
    map.set(theme.id, theme)
    setSvgKitSource(theme.id, 'seed')
  }
  for (const theme of liveThemes) {
    map.set(theme.id, theme)
    setSvgKitSource(theme.id, 'cdn')
  }
  return { store: { backend: 'r2', writable: true }, themes: [...map.values()] }
}

// fresh: skip the CDN (cached for a day) and ask the API, for the admin page.
export async function loadSvgKits({ fresh = false }: { fresh?: boolean } = {}): Promise<SvgKitsListResponse> {
  if (import.meta.env.PROD && !fresh) {
    try {
      return await loadFromCdn()
    } catch {
      /* fall back to the API */
    }
  }
  try {
    const res = await fetch(SVG_KITS_API)
    if (!res.ok) return loadSeedFallback()
    const data = (await res.json()) as SvgKitsListResponse
    for (const theme of data.themes) setSvgKitSource(theme.id, 'api')
    return data
  } catch {
    return loadSeedFallback()
  }
}

async function loadSeedTheme(id: string) {
  const res = await fetch(seedManifestUrl(id))
  if (!res.ok) return null
  setSvgKitSource(id, 'seed')
  return (await res.json()) as SvgKitTheme
}

export async function loadSvgKit(id: string) {
  if (import.meta.env.PROD) {
    try {
      const res = await fetch(cdnManifestUrl(id))
      if (res.ok) {
        setSvgKitSource(id, 'cdn')
        return (await res.json()) as SvgKitTheme
      }
      // Not in R2: the theme can only be a seed theme. Other errors fall back to the API.
      if (res.status === 404) return loadSeedTheme(id)
    } catch {
      /* fall back to the API */
    }
  }
  try {
    const res = await fetch(`${SVG_KITS_API}/${id}`)
    if (res.ok) {
      setSvgKitSource(id, 'api')
      const data = (await res.json()) as { theme: SvgKitTheme }
      return data.theme
    }
  } catch {
    /* fall through */
  }
  return loadSeedTheme(id)
}

export async function saveSvgKit(
  theme: SvgKitTheme,
  files: Record<string, string>,
  sheet: string | undefined,
  token: string,
) {
  const res = await fetch(`${SVG_KITS_API}/${theme.id}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ theme, files, sheet }),
  })
  const data = (await res.json()) as { error?: string; errors?: string[]; hint?: string; theme?: SvgKitTheme }
  if (!res.ok) {
    const extra = data.errors?.length ? `\n- ${data.errors.join('\n- ')}` : ''
    throw new Error(`${data.error || res.status}${data.hint ? ` — ${data.hint}` : ''}${extra}`)
  }
  return data
}

export async function seedSvgKits(token: string) {
  const res = await fetch(`${SVG_KITS_API}/seed`, {
    method: 'POST',
    headers: { authorization: `Bearer ${token}` },
  })
  const data = (await res.json()) as { error?: string; hint?: string; copied?: string[] }
  if (!res.ok) throw new Error(`${data.error || res.status}${data.hint ? ` — ${data.hint}` : ''}`)
  return data
}

export async function deleteSvgKit(id: string, token: string) {
  const res = await fetch(`${SVG_KITS_API}/${id}`, {
    method: 'DELETE',
    headers: { authorization: `Bearer ${token}` },
  })
  const data = (await res.json()) as { error?: string; hint?: string }
  if (!res.ok) throw new Error(`${data.error || res.status}${data.hint ? ` — ${data.hint}` : ''}`)
  return data
}
