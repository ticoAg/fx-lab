import { handleSvgKitsRequest, planUnlist, updateIndex, type AssetBody, type KitStore, type UnlistResult } from '../../_lib/http.ts'
import type { StoreInfo, SvgKitTheme } from '../../_lib/model.ts'
import type { R2Bucket } from '../../_lib/r2.ts'
import { d1ViewsStore, type SvgKitViewsDatabase } from '../../_lib/views.ts'

type Fetcher = { fetch: (input: Request | string) => Promise<Response> }

export type Env = {
  SVG_KITS?: R2Bucket
  SVG_KITS_ADMIN_TOKEN?: string
  SVG_KITS_VIEWS?: SvgKitViewsDatabase
  ASSETS: Fetcher
}

const SVG_TYPE = 'image/svg+xml; charset=utf-8'
const JSON_TYPE = 'application/json; charset=utf-8'

class R2KitStore implements KitStore {
  bucket: R2Bucket
  info: StoreInfo

  constructor(bucket: R2Bucket, info: StoreInfo) {
    this.bucket = bucket
    this.info = info
  }

  private async readIndex() {
    const obj = await this.bucket.get('index.json')
    if (!obj) return []
    const data = JSON.parse(await obj.text()) as { themes?: string[] }
    return data.themes ?? []
  }

  // One read-modify-write of index.json. onlyIf retries so a concurrent PUT
  // is re-read instead of overwritten. Theme directories are not touched.
  private editIndex(mutate: (ids: string[]) => string[] | null) {
    return updateIndex(
      async () => {
        const obj = await this.bucket.get('index.json')
        if (!obj) return { themes: [] }
        const data = JSON.parse(await obj.text()) as { themes?: string[] }
        return { themes: data.themes ?? [], etag: obj.etag }
      },
      async (themes, etag) => {
        const written = await this.bucket.put('index.json', JSON.stringify({ themes }, null, 2), {
          httpMetadata: { contentType: JSON_TYPE },
          ...(etag ? { onlyIf: { etagMatches: etag } } : {}),
        })
        return written !== null
      },
      mutate,
    )
  }

  async list() {
    const out: SvgKitTheme[] = []
    for (const id of await this.readIndex()) {
      const theme = await this.get(id)
      if (theme) out.push(theme)
    }
    return out
  }

  async get(id: string) {
    const obj = await this.bucket.get(`themes/${id}/manifest.json`)
    if (!obj) return null
    return JSON.parse(await obj.text()) as SvgKitTheme
  }

  async getIcon(themeId: string, iconId: string): Promise<AssetBody | null> {
    const obj = await this.bucket.get(`themes/${themeId}/icons/${iconId}.svg`)
    if (!obj) return null
    return { body: new Uint8Array(await obj.arrayBuffer()), contentType: SVG_TYPE }
  }

  async putTheme(theme: SvgKitTheme, files?: Map<string, Uint8Array>) {
    await this.bucket.put(`themes/${theme.id}/manifest.json`, JSON.stringify(theme, null, 2), {
      httpMetadata: { contentType: JSON_TYPE },
    })
    if (files) {
      for (const [id, bytes] of files) {
        await this.bucket.put(`themes/${theme.id}/icons/${id}.svg`, bytes, {
          httpMetadata: { contentType: SVG_TYPE },
        })
      }
    }
    await this.editIndex((ids) => (ids.includes(theme.id) ? null : [...ids, theme.id]))
  }

  async deleteTheme(id: string) {
    const existing = await this.get(id)
    if (!existing) return false
    let cursor: string | undefined
    do {
      const page = await this.bucket.list({ prefix: `themes/${id}/`, cursor })
      for (const obj of page.objects) await this.bucket.delete(obj.key)
      cursor = page.truncated ? page.cursor : undefined
    } while (cursor)
    await this.editIndex((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : null))
    return true
  }

  async unlistThemes(slugs: string[]) {
    let plan = planUnlist([], slugs)
    const themes = await this.editIndex((ids) => {
      plan = planUnlist(ids, slugs)
      return plan.changed ? plan.themes : null
    })
    return { removed: plan.removed, absent: plan.absent, themes }
  }
}

class AssetsSeedStore implements KitStore {
  assets: Fetcher
  origin: string
  info: StoreInfo

  constructor(assets: Fetcher, origin: string, info: StoreInfo = { backend: 'seed', writable: false }) {
    this.assets = assets
    this.origin = origin
    this.info = info
  }

  private fetch(path: string) {
    return this.assets.fetch(new URL(`/seed-svg-kits/${path}`, this.origin).toString())
  }

  async list() {
    const res = await this.fetch('index.json')
    if (!res.ok) return []
    const data = (await res.json()) as { themes?: string[] }
    const out: SvgKitTheme[] = []
    for (const id of data.themes ?? []) {
      const theme = await this.get(id)
      if (theme) out.push(theme)
    }
    return out
  }

  async get(id: string) {
    const res = await this.fetch(`${id}/manifest.json`)
    if (!res.ok) return null
    return (await res.json()) as SvgKitTheme
  }

  async getIcon(themeId: string, iconId: string): Promise<AssetBody | null> {
    const res = await this.fetch(`${themeId}/icons/${iconId}.svg`)
    if (!res.ok) return null
    return { body: new Uint8Array(await res.arrayBuffer()), contentType: SVG_TYPE }
  }

  async putTheme() {
    throw new Error('seed store is read-only')
  }

  async deleteTheme() {
    return false
  }

  async unlistThemes(): Promise<UnlistResult> {
    throw new Error('seed store is read-only')
  }
}

const SETUP_HINT =
  'Create R2 bucket fx-lab-svg-kits, bind it as SVG_KITS on the Pages project, set SVG_KITS_ADMIN_TOKEN, then POST /api/svg-kits/seed or use /svg-kits/admin.'

export const onRequest = async (context: { request: Request; env: Env }) => {
  const seed = new AssetsSeedStore(context.env.ASSETS, context.request.url)
  const store = context.env.SVG_KITS
    ? new R2KitStore(context.env.SVG_KITS, { backend: 'r2', writable: true })
    : seed
  return handleSvgKitsRequest(context.request, store, seed, {
    adminToken: context.env.SVG_KITS_ADMIN_TOKEN,
    setupHint: SETUP_HINT,
    views: context.env.SVG_KITS_VIEWS ? d1ViewsStore(context.env.SVG_KITS_VIEWS) : undefined,
  })
}
