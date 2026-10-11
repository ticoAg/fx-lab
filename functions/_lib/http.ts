import { isSvgMarkup, validateTheme, type StoreInfo, type SvgKitTheme } from './model.ts'

export type AssetBody = { body: Uint8Array; contentType: string }

export type KitStore = {
  info: StoreInfo
  list(): Promise<SvgKitTheme[]>
  get(id: string): Promise<SvgKitTheme | null>
  getIcon(themeId: string, iconId: string): Promise<AssetBody | null>
  getSheet(themeId: string): Promise<AssetBody | null>
  putTheme(theme: SvgKitTheme, files?: Map<string, Uint8Array>, sheet?: Uint8Array | null): Promise<void>
  deleteTheme(id: string): Promise<boolean>
}

const SVG_TYPE = 'image/svg+xml; charset=utf-8'
const JSON_TYPE = 'application/json; charset=utf-8'
const MAX_SVG_BYTES = 10 * 1024 * 1024

export function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': JSON_TYPE, 'cache-control': 'no-store' },
  })
}

export function svgResponse(asset: AssetBody) {
  return new Response(new TextDecoder().decode(asset.body), {
    headers: {
      'content-type': asset.contentType || SVG_TYPE,
      'cache-control': 'public, max-age=60',
    },
  })
}

export function overlayStore(primary: KitStore | null, seed: KitStore): KitStore {
  if (!primary) {
    return {
      info: { backend: 'seed', writable: false },
      list: () => seed.list(),
      get: (id) => seed.get(id),
      getIcon: (themeId, iconId) => seed.getIcon(themeId, iconId),
      getSheet: (themeId) => seed.getSheet(themeId),
      putTheme: async () => {
        throw new Error('store is read-only')
      },
      deleteTheme: async () => false,
    }
  }

  const pick = async (id: string) => ((await primary.get(id)) ? primary : seed)

  return {
    info: primary.info,
    async list() {
      const [seedThemes, live] = await Promise.all([seed.list(), primary.list()])
      const map = new Map<string, SvgKitTheme>()
      for (const theme of seedThemes) map.set(theme.id, theme)
      for (const theme of live) map.set(theme.id, theme)
      return [...map.values()]
    },
    async get(id) {
      return (await primary.get(id)) ?? seed.get(id)
    },
    async getIcon(themeId, iconId) {
      const store = await pick(themeId)
      return (await store.getIcon(themeId, iconId)) ?? seed.getIcon(themeId, iconId)
    },
    async getSheet(themeId) {
      const store = await pick(themeId)
      return (await store.getSheet(themeId)) ?? seed.getSheet(themeId)
    },
    putTheme: (theme, files, sheet) => primary.putTheme(theme, files, sheet),
    deleteTheme: (id) => primary.deleteTheme(id),
  }
}

export async function copyKits(from: KitStore, to: KitStore) {
  const copied: string[] = []
  for (const theme of await from.list()) {
    const files = new Map<string, Uint8Array>()
    for (const icon of theme.icons) {
      const asset = await from.getIcon(theme.id, icon.id)
      if (asset) files.set(icon.id, asset.body)
    }
    const sheet = theme.sheet ? await from.getSheet(theme.id) : null
    await to.putTheme(theme, files, sheet?.body ?? null)
    copied.push(theme.id)
  }
  return copied
}

function adminAuthorized(request: Request, token: string | undefined) {
  if (!token) return false
  const header = request.headers.get('authorization')
  if (header?.startsWith('Bearer ') && header.slice(7) === token) return true
  return request.headers.get('x-svg-kits-token') === token
}

function pathParts(url: URL) {
  const parts = url.pathname.replace(/\/+$/, '').split('/').filter(Boolean)
  if (parts[0] !== 'api' || parts[1] !== 'svg-kits') return null
  return parts.slice(2)
}

async function readWritePayload(request: Request) {
  const contentType = request.headers.get('content-type') || ''
  const files = new Map<string, Uint8Array>()
  let sheet: Uint8Array | null | undefined
  let themeRaw: unknown

  if (contentType.includes('multipart/form-data')) {
    const form = await request.formData()
    const manifest = form.get('manifest')
    themeRaw = typeof manifest === 'string' ? JSON.parse(manifest) : manifest
    const sheetField = form.get('sheet')
    if (sheetField instanceof File) {
      sheet = new Uint8Array(await sheetField.arrayBuffer())
    }
    for (const [key, value] of form.entries()) {
      if (key === 'manifest' || key === 'sheet' || key === 'meta') continue
      if (value instanceof File) {
        const id = key.replace(/\.svg$/i, '')
        files.set(id, new Uint8Array(await value.arrayBuffer()))
      }
    }
  } else {
    const body = (await request.json()) as {
      theme?: unknown
      files?: Record<string, string>
      sheet?: string | null
    }
    themeRaw = body.theme ?? body
    if (body.files) {
      for (const [id, text] of Object.entries(body.files)) {
        files.set(id, new TextEncoder().encode(text))
      }
    }
    if (typeof body.sheet === 'string') sheet = new TextEncoder().encode(body.sheet)
    else if (body.sheet === null) sheet = null
  }

  return { themeRaw, files, sheet }
}

function ensureSvgs(files: Map<string, Uint8Array>, errors: string[]) {
  for (const [id, bytes] of files) {
    if (bytes.byteLength > MAX_SVG_BYTES) errors.push(`icon "${id}": file too large`)
    const text = new TextDecoder().decode(bytes.slice(0, 400))
    if (!isSvgMarkup(text)) errors.push(`icon "${id}": not an SVG file`)
  }
}

export async function handleSvgKitsRequest(
  request: Request,
  store: KitStore,
  seed: KitStore,
  opts: { adminToken?: string; setupHint: string },
): Promise<Response> {
  const url = new URL(request.url)
  const rest = pathParts(url)
  if (!rest) return jsonResponse({ error: 'not found' }, 404)

  const method = request.method.toUpperCase()
  if (method === 'OPTIONS') return new Response(null, { status: 204 })

  const writeGuard = () => {
    if (!store.info.writable) {
      return jsonResponse(
        {
          error: 'writable store is not configured',
          hint: opts.setupHint,
        },
        503,
      )
    }
    if (!opts.adminToken) {
      return jsonResponse(
        { error: 'SVG_KITS_ADMIN_TOKEN is not set', hint: opts.setupHint },
        503,
      )
    }
    if (!adminAuthorized(request, opts.adminToken)) {
      return jsonResponse({ error: 'unauthorized' }, 401)
    }
    return null
  }

  try {
    if (rest.length === 0 && method === 'GET') {
      const themes = await overlayStore(store.info.writable ? store : null, seed).list()
      return jsonResponse({ store: store.info, themes })
    }

    if (rest.length === 1 && rest[0] === 'seed' && method === 'POST') {
      const denied = writeGuard()
      if (denied) return denied
      const copied = await copyKits(seed, store)
      return jsonResponse({ ok: true, copied, store: store.info })
    }

    if (rest.length === 0) return jsonResponse({ error: 'method not allowed' }, 405)

    const themeId = rest[0]
    const live = overlayStore(store.info.writable ? store : null, seed)

    if (rest.length === 1 && method === 'GET') {
      const theme = await live.get(themeId)
      if (!theme) return jsonResponse({ error: 'theme not found' }, 404)
      return jsonResponse({ store: store.info, theme })
    }

    if (rest.length === 1 && (method === 'PUT' || method === 'POST')) {
      const denied = writeGuard()
      if (denied) return denied
      const payload = await readWritePayload(request)
      const checked = validateTheme(payload.themeRaw)
      if (!checked.theme) return jsonResponse({ error: 'invalid theme', errors: checked.errors }, 400)
      if (checked.theme.id !== themeId) {
        return jsonResponse({ error: `theme id must match URL (${themeId})` }, 400)
      }
      const errors: string[] = []
      ensureSvgs(payload.files, errors)
      if (payload.sheet) {
        if (payload.sheet.byteLength > MAX_SVG_BYTES) errors.push('sheet: file too large')
        if (!isSvgMarkup(new TextDecoder().decode(payload.sheet.slice(0, 400)))) errors.push('sheet: not an SVG file')
      }
      const existing = await store.get(themeId)
      const existingIds = new Set(existing?.icons.map((icon) => icon.id) ?? [])
      // Skip icons already carried by this request or the writable theme. Anything
      // left is checked against one seed manifest read. seed.getIcon per icon is an
      // assets.fetch, and a Worker invocation fails around 50 of those ("Too many
      // subrequests") before putTheme runs — so a 90-icon kit never partially writes.
      const unresolved = checked.theme.icons.filter(
        (icon) => !payload.files.has(icon.id) && !existingIds.has(icon.id),
      )
      let seedIds = new Set<string>()
      if (unresolved.length) {
        const seedTheme = await seed.get(themeId)
        seedIds = new Set(seedTheme?.icons.map((icon) => icon.id) ?? [])
      }
      for (const icon of unresolved) {
        if (!seedIds.has(icon.id)) errors.push(`icon "${icon.id}": missing SVG file`)
      }
      if (errors.length) return jsonResponse({ error: 'invalid files', errors }, 400)
      await store.putTheme(checked.theme, payload.files, payload.sheet)
      return jsonResponse({ ok: true, theme: await store.get(themeId), store: store.info })
    }

    if (rest.length === 1 && method === 'DELETE') {
      const denied = writeGuard()
      if (denied) return denied
      const ok = await store.deleteTheme(themeId)
      return jsonResponse({ ok, store: store.info }, ok ? 200 : 404)
    }

    if (rest.length === 3 && rest[1] === 'icons' && method === 'GET') {
      const iconId = rest[2].replace(/\.svg$/i, '')
      const asset = await live.getIcon(themeId, iconId)
      if (!asset) return jsonResponse({ error: 'icon not found' }, 404)
      return svgResponse(asset)
    }

    if (rest.length === 2 && rest[1] === 'sheet' && method === 'GET') {
      const asset = await live.getSheet(themeId)
      if (!asset) return jsonResponse({ error: 'sheet not found' }, 404)
      return svgResponse(asset)
    }

    return jsonResponse({ error: 'not found' }, 404)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return jsonResponse({ error: message }, 500)
  }
}
