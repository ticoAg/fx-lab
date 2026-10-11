import { setSvgKitAssetMode, SVG_KITS_API, SVG_KITS_SEED, type SvgKitsStoreInfo, type SvgKitTheme } from './types.ts'

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

async function loadSeedFallback(): Promise<SvgKitsListResponse> {
  const res = await fetch(`${SVG_KITS_SEED}/index.json`)
  if (!res.ok) throw new Error('SVG Kits store unavailable')
  const data = (await res.json()) as { themes?: string[] }
  const themes: SvgKitTheme[] = []
  for (const id of data.themes ?? []) {
    const item = await fetch(`${SVG_KITS_SEED}/${id}/manifest.json`)
    if (item.ok) themes.push((await item.json()) as SvgKitTheme)
  }
  setSvgKitAssetMode('seed')
  return { store: { backend: 'seed', writable: false }, themes }
}

export async function loadSvgKits(): Promise<SvgKitsListResponse> {
  try {
    const res = await fetch(SVG_KITS_API)
    if (!res.ok) return loadSeedFallback()
    const data = (await res.json()) as SvgKitsListResponse
    setSvgKitAssetMode('api')
    return data
  } catch {
    return loadSeedFallback()
  }
}

export async function loadSvgKit(id: string) {
  try {
    const res = await fetch(`${SVG_KITS_API}/${id}`)
    if (res.ok) {
      setSvgKitAssetMode('api')
      const data = (await res.json()) as { theme: SvgKitTheme }
      return data.theme
    }
  } catch {
    /* fall through */
  }
  const res = await fetch(`${SVG_KITS_SEED}/${id}/manifest.json`)
  if (!res.ok) return null
  setSvgKitAssetMode('seed')
  return (await res.json()) as SvgKitTheme
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
