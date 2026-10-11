/**
 * Copy seed/svg-kits into the local writable store (.data/svg-kits).
 * With --api http://127.0.0.1:5173 it POSTs each theme to the running API instead.
 *
 *   npm run seed:svg-kits
 *   SVG_KITS_ADMIN_TOKEN=dev npm run seed:svg-kits -- --api http://127.0.0.1:5173
 */
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { copyKits } from '../functions/_lib/http.ts'
import { FsKitStore, SeedDirStore } from './lib/svg-kits-fs-store.ts'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const seedRoot = join(root, 'seed/svg-kits')
const dataRoot = join(root, '.data/svg-kits')
const seed = new SeedDirStore(seedRoot)

const apiFlag = process.argv.indexOf('--api')
const api = apiFlag >= 0 ? process.argv[apiFlag + 1] : null
const token = process.env.SVG_KITS_ADMIN_TOKEN || 'dev'

async function seedViaApi(base: string) {
  const themes = await seed.list()
  const copied: string[] = []
  for (const theme of themes) {
    const files: Record<string, string> = {}
    for (const icon of theme.icons) {
      const asset = await seed.getIcon(theme.id, icon.id)
      if (asset) files[icon.id] = new TextDecoder().decode(asset.body)
    }
    const res = await fetch(`${base.replace(/\/$/, '')}/api/svg-kits/${theme.id}`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ theme, files }),
    })
    const body = (await res.json()) as { error?: string; hint?: string }
    if (!res.ok) throw new Error(`${theme.id}: ${body.error || res.status}${body.hint ? ` — ${body.hint}` : ''}`)
    copied.push(theme.id)
  }
  return copied
}

const copied = api
  ? await seedViaApi(api)
  : await copyKits(seed, new FsKitStore(dataRoot, { backend: 'local', writable: true }))

console.log(`seeded ${copied.length} themes: ${copied.join(', ')}`)
