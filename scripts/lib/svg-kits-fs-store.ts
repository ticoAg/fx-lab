import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { planUnlist, type AssetBody, type KitStore, type UnlistResult } from '../../functions/_lib/http.ts'
import { validateSvgKitViews, type StoreInfo, type SvgKitTheme } from '../../functions/_lib/model.ts'

const SVG_TYPE = 'image/svg+xml; charset=utf-8'

function readJson<T>(path: string): T | null {
  if (!existsSync(path)) return null
  return JSON.parse(readFileSync(path, 'utf8')) as T
}

export class FsKitStore implements KitStore {
  root: string
  info: StoreInfo

  constructor(root: string, info: StoreInfo) {
    this.root = root
    this.info = info
    mkdirSync(join(root, 'themes'), { recursive: true })
  }

  themeDir(id: string) {
    return join(this.root, 'themes', id)
  }

  private readIndex() {
    const data = readJson<{ themes: string[] }>(join(this.root, 'index.json'))
    return data?.themes ?? []
  }

  private writeIndex(ids: string[]) {
    writeFileSync(join(this.root, 'index.json'), JSON.stringify({ themes: ids }, null, 2) + '\n')
  }

  async list() {
    const out: SvgKitTheme[] = []
    for (const id of this.readIndex()) {
      const theme = await this.get(id)
      if (theme) out.push(theme)
    }
    return out
  }

  async get(id: string) {
    return readJson<SvgKitTheme>(join(this.themeDir(id), 'manifest.json'))
  }

  async readViews() {
    return validateSvgKitViews(readJson<unknown>(join(this.root, 'views.json')) ?? {})
  }

  async recordView(themeId: string) {
    // Keep the local read/increment/write synchronous so requests cannot lose increments.
    const path = join(this.root, 'views.json')
    const views = validateSvgKitViews(readJson<unknown>(path) ?? {})
    views[themeId] = (views[themeId] ?? 0) + 1
    writeFileSync(path, JSON.stringify(views) + '\n')
  }

  async getIcon(themeId: string, iconId: string): Promise<AssetBody | null> {
    const path = join(this.themeDir(themeId), 'icons', `${iconId}.svg`)
    if (!existsSync(path)) return null
    return { body: new Uint8Array(readFileSync(path)), contentType: SVG_TYPE }
  }

  async putTheme(theme: SvgKitTheme, files?: Map<string, Uint8Array>) {
    const dir = this.themeDir(theme.id)
    mkdirSync(join(dir, 'icons'), { recursive: true })
    writeFileSync(join(dir, 'manifest.json'), JSON.stringify(theme, null, 2) + '\n')
    if (files) {
      for (const [id, bytes] of files) {
        writeFileSync(join(dir, 'icons', `${id}.svg`), bytes)
      }
    }
    const ids = this.readIndex()
    if (!ids.includes(theme.id)) {
      ids.push(theme.id)
      this.writeIndex(ids)
    }
  }

  async deleteTheme(id: string) {
    const dir = this.themeDir(id)
    if (!existsSync(dir)) return false
    rmSync(dir, { recursive: true, force: true })
    const ids = this.readIndex()
    if (ids.includes(id)) this.writeIndex(ids.filter((x) => x !== id))
    return true
  }

  async unlistThemes(slugs: string[]) {
    const plan = planUnlist(this.readIndex(), slugs)
    if (plan.changed) this.writeIndex(plan.themes)
    return { removed: plan.removed, absent: plan.absent, themes: plan.themes }
  }
}

export class SeedDirStore implements KitStore {
  root: string
  info: StoreInfo

  constructor(root: string, info: StoreInfo = { backend: 'seed', writable: false }) {
    this.root = root
    this.info = info
  }

  themeDir(id: string) {
    return join(this.root, id)
  }

  async list() {
    const index = readJson<{ themes: string[] }>(join(this.root, 'index.json'))
    const ids = index?.themes ?? []
    const out: SvgKitTheme[] = []
    for (const id of ids) {
      const theme = await this.get(id)
      if (theme) out.push(theme)
    }
    return out
  }

  async get(id: string) {
    return readJson<SvgKitTheme>(join(this.themeDir(id), 'manifest.json'))
  }

  async getIcon(themeId: string, iconId: string): Promise<AssetBody | null> {
    const path = join(this.themeDir(themeId), 'icons', `${iconId}.svg`)
    if (!existsSync(path)) return null
    return { body: new Uint8Array(readFileSync(path)), contentType: SVG_TYPE }
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

export function seedLocalStore(seedRoot: string, dataRoot: string) {
  const local = new FsKitStore(dataRoot, { backend: 'local', writable: true })
  if (localReadEmpty(dataRoot) && existsSync(join(seedRoot, 'index.json'))) {
    mkdirSync(dataRoot, { recursive: true })
    const index = JSON.parse(readFileSync(join(seedRoot, 'index.json'), 'utf8')) as { themes: string[] }
    for (const id of index.themes) {
      const dest = join(dataRoot, 'themes', id)
      mkdirSync(dest, { recursive: true })
      cpSync(join(seedRoot, id), dest, { recursive: true })
    }
    writeFileSync(join(dataRoot, 'index.json'), JSON.stringify({ themes: index.themes }, null, 2) + '\n')
  }
  return local
}

function localReadEmpty(dataRoot: string) {
  const index = join(dataRoot, 'index.json')
  if (!existsSync(index)) return true
  try {
    const data = JSON.parse(readFileSync(index, 'utf8')) as { themes?: string[] }
    return !data.themes?.length
  } catch {
    return true
  }
}

export function copySeedToDist(seedRoot: string, outDir: string) {
  const dest = join(outDir, 'seed-svg-kits')
  mkdirSync(outDir, { recursive: true })
  cpSync(seedRoot, dest, { recursive: true })
  return dest
}

export function mimeFor(path: string) {
  if (path.endsWith('.json')) return 'application/json; charset=utf-8'
  if (path.endsWith('.svg')) return 'image/svg+xml; charset=utf-8'
  return 'application/octet-stream'
}

export function readSeedPublicFile(seedRoot: string, urlPath: string) {
  const rel = urlPath.replace(/^\/seed-svg-kits\/?/, '')
  if (!rel || rel.includes('..')) return null
  const path = join(seedRoot, rel)
  if (!existsSync(path) || !statSync(path).isFile()) return null
  return { body: readFileSync(path), contentType: mimeFor(path) }
}
