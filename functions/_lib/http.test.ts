import assert from 'node:assert/strict'
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { FsKitStore } from '../../scripts/lib/svg-kits-fs-store.ts'
import { handleSvgKitsRequest, planUnlist, updateIndex, type AssetBody, type KitStore, type UnlistResult } from './http.ts'
import type { StoreInfo, SvgKitIcon, SvgKitTheme } from './model.ts'

const TOKEN = 'test-token'
const SETUP = 'test setup'

function icon(id: string): SvgKitIcon {
  return {
    id,
    title: { zh: id, en: id },
    description: { zh: `${id} 描述`, en: `${id} description` },
    animation: 'none',
  }
}

function theme(id: string, iconIds: string[]): SvgKitTheme {
  return {
    id,
    title: { zh: id, en: id },
    description: { zh: `${id} 描述`, en: `${id} description` },
    cover: iconIds[0],
    icons: iconIds.map(icon),
  }
}

function svg(id: string) {
  return `<svg id="${id}" xmlns="http://www.w3.org/2000/svg"></svg>`
}

function memoryStore(info: StoreInfo, themes: SvgKitTheme[] = []) {
  const manifests = new Map(themes.map((item) => [item.id, structuredClone(item)]))
  const files = new Map<string, Uint8Array>()
  const index = themes.map((item) => item.id)
  const calls = { get: [] as string[], getIcon: [] as string[], putTheme: 0, unlist: 0, indexWrites: 0 }

  const store: KitStore = {
    info,
    async list() {
      return [...manifests.values()]
    },
    async get(id) {
      calls.get.push(id)
      return manifests.get(id) ?? null
    },
    async getIcon(themeId, iconId): Promise<AssetBody | null> {
      calls.getIcon.push(`${themeId}/${iconId}`)
      const body = files.get(`${themeId}/${iconId}`)
      return body ? { body, contentType: 'image/svg+xml' } : null
    },
    async putTheme(next, nextFiles) {
      calls.putTheme += 1
      manifests.set(next.id, structuredClone(next))
      if (nextFiles) {
        for (const [iconId, bytes] of nextFiles) files.set(`${next.id}/${iconId}`, bytes)
      }
    },
    async deleteTheme(id) {
      return manifests.delete(id)
    },
    async unlistThemes(slugs) {
      calls.unlist += 1
      const plan = planUnlist(index, slugs)
      if (plan.changed) {
        calls.indexWrites += 1
        index.splice(0, index.length, ...plan.themes)
      }
      return { removed: plan.removed, absent: plan.absent, themes: [...index] }
    },
  }

  return { store, calls, manifests, index }
}

function putRequest(kit: SvgKitTheme, files: Record<string, string> = {}, method = 'PUT') {
  return new Request(`https://example.test/api/svg-kits/${kit.id}`, {
    method,
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${TOKEN}`,
    },
    body: JSON.stringify({ theme: kit, files }),
  })
}

function range(prefix: string, count: number) {
  return Array.from({ length: count }, (_, index) => `${prefix}-${index + 1}`)
}

function paddedSvg(bytes: number) {
  const open = '<svg xmlns="http://www.w3.org/2000/svg">'
  const close = '</svg>'
  return open + ' '.repeat(bytes - open.length - close.length) + close
}

async function putTheme(
  store: KitStore,
  seed: KitStore,
  kit: SvgKitTheme,
  files: Record<string, string> = {},
  method = 'PUT',
) {
  const response = await handleSvgKitsRequest(putRequest(kit, files, method), store, seed, {
    adminToken: TOKEN,
    setupHint: SETUP,
  })
  const body = (await response.json()) as { error?: string; errors?: string[]; ok?: boolean; theme?: SvgKitTheme }
  return { response, body }
}

test('PUT of 100 icons with files does not read the seed', async () => {
  const writable = memoryStore({ backend: 'r2', writable: true })
  const seed = memoryStore({ backend: 'seed', writable: false })
  const ids = range('icon', 100)
  const kit = theme('eastern-myth', ids)
  const files = Object.fromEntries(ids.map((id) => [id, svg(id)]))

  const { response, body } = await putTheme(writable.store, seed.store, kit, files)

  assert.equal(response.status, 200)
  assert.equal(body.ok, true)
  assert.equal(body.theme?.icons.length, 100)
  assert.deepEqual(seed.calls.get, [])
  assert.deepEqual(seed.calls.getIcon, [])
  assert.equal(writable.calls.putTheme, 1)
})

test('icons missing from the request are accepted from one seed manifest read', async () => {
  const ids = range('icon', 100)
  const seed = memoryStore({ backend: 'seed', writable: false }, [theme('eastern-myth', ids)])
  const writable = memoryStore({ backend: 'r2', writable: true })
  const kit = theme('eastern-myth', ids)

  const { response, body } = await putTheme(writable.store, seed.store, kit)

  assert.equal(response.status, 200)
  assert.equal(body.theme?.icons.length, 100)
  assert.deepEqual(seed.calls.get, ['eastern-myth'])
  assert.deepEqual(seed.calls.getIcon, [])
})

test('a 93-icon delta checks seed once and does not write when an icon is unknown', async () => {
  const kept = range('kept', 46)
  const added = range('added', 22)
  const fromSeed = range('seeded', 25)
  const writable = memoryStore({ backend: 'r2', writable: true }, [theme('eastern-myth', kept)])
  const seed = memoryStore({ backend: 'seed', writable: false }, [theme('eastern-myth', fromSeed)])
  const files = Object.fromEntries(added.map((id) => [id, svg(id)]))
  const missing = theme('eastern-myth', [...kept, ...added, ...fromSeed, 'not-stored'])

  const rejected = await putTheme(writable.store, seed.store, missing, files)
  assert.equal(rejected.response.status, 400)
  assert.equal(rejected.body.error, 'invalid files')
  assert.deepEqual(rejected.body.errors, ['icon "not-stored": missing SVG file'])
  assert.equal(writable.calls.putTheme, 0)
  assert.deepEqual(writable.manifests.get('eastern-myth')?.icons.map((item) => item.id), kept)
  assert.deepEqual(seed.calls.get, ['eastern-myth'])
  assert.deepEqual(seed.calls.getIcon, [])

  const kit = theme('eastern-myth', [...kept, ...added, ...fromSeed])
  const saved = await putTheme(writable.store, seed.store, kit, files)
  assert.equal(saved.response.status, 200)
  assert.equal(saved.body.theme?.icons.length, 93)
  assert.deepEqual(seed.calls.getIcon, [])
  assert.equal(seed.calls.get.length, 2)
})

test('POST uses the same seed check and does not call getIcon', async () => {
  const writable = memoryStore({ backend: 'r2', writable: true })
  const seed = memoryStore({ backend: 'seed', writable: false })
  const kit = theme('eastern-myth', ['orphan'])

  const { response, body } = await putTheme(writable.store, seed.store, kit, {}, 'POST')

  assert.equal(response.status, 400)
  assert.deepEqual(body.errors, ['icon "orphan": missing SVG file'])
  assert.equal(writable.calls.putTheme, 0)
  assert.deepEqual(seed.calls.getIcon, [])
  assert.deepEqual(seed.calls.get, ['eastern-myth'])
})

test('icon themes reject files over the icon budget; illustration themes accept them', async () => {
  const writable = memoryStore({ backend: 'r2', writable: true })
  const seed = memoryStore({ backend: 'seed', writable: false })
  const heavy = `<svg xmlns="http://www.w3.org/2000/svg">${'<path d="M0 0"/>'.repeat(300)}</svg>`

  const rejected = await putTheme(writable.store, seed.store, theme('heavy', ['big']), { big: heavy })
  assert.equal(rejected.response.status, 400)
  assert.match(rejected.body.errors?.[0] ?? '', /^icon "big": over budget \(.*icon limit is 24 KB, 200 elements\)$/)
  assert.equal(writable.calls.putTheme, 0)

  const kit = { ...theme('heavy', ['big']), kind: 'illustration' as const }
  const saved = await putTheme(writable.store, seed.store, kit, { big: heavy })
  assert.equal(saved.response.status, 200)
  assert.equal(saved.body.theme?.kind, 'illustration')
})

test('an unknown kind is rejected', async () => {
  const writable = memoryStore({ backend: 'r2', writable: true })
  const seed = memoryStore({ backend: 'seed', writable: false })
  const kit = { ...theme('odd', ['a']), kind: 'poster' } as unknown as SvgKitTheme

  const { response, body } = await putTheme(writable.store, seed.store, kit, { a: svg('a') })
  assert.equal(response.status, 400)
  assert.deepEqual(body.errors, ['kind must be one of icon, illustration'])
})

test('icon files over 10MB and non-SVG files are rejected', async () => {
  const writable = memoryStore({ backend: 'r2', writable: true })
  const seed = memoryStore({ backend: 'seed', writable: false })
  const kit = theme('merged', ['mark'])

  const over = paddedSvg(10 * 1024 * 1024 + 1)
  const rejected = await putTheme(writable.store, seed.store, kit, { mark: over })
  assert.equal(rejected.response.status, 400)
  assert.equal(rejected.body.error, 'invalid files')
  assert.deepEqual(rejected.body.errors, ['icon "mark": file too large'])
  assert.equal(writable.calls.putTheme, 0)

  const notSvg = await putTheme(writable.store, seed.store, kit, { mark: 'not an svg' })
  assert.equal(notSvg.response.status, 400)
  assert.deepEqual(notSvg.body.errors, ['icon "mark": not an SVG file'])
  assert.equal(writable.calls.putTheme, 0)
})

test('public views count existing themes, including seeds, without changing manifests', async () => {
  const writable = memoryStore({ backend: 'r2', writable: true }, [theme('live', ['a'])])
  const seed = memoryStore({ backend: 'seed', writable: false }, [theme('seeded', ['b'])])
  const counts: Record<string, number> = {}
  const opts = {
    setupHint: SETUP,
    views: {
      async readViews() { return { ...counts } },
      async recordView(id: string) { counts[id] = (counts[id] ?? 0) + 1 },
    },
  }
  const visit = (id: string, origin = 'https://example.test', contentType = 'application/json') =>
    handleSvgKitsRequest(new Request(`https://example.test/api/svg-kits/${id}/views`, {
      method: 'POST',
      headers: { origin, 'content-type': contentType },
    }), writable.store, seed.store, opts)

  assert.equal((await visit('live')).status, 204)
  assert.equal((await visit('live')).status, 204)
  assert.equal((await visit('seeded')).status, 204)
  assert.equal((await visit('missing')).status, 404)
  assert.equal((await visit('live', 'https://other.test')).status, 403)
  assert.equal((await visit('live', 'https://example.test', 'text/plain')).status, 415)
  assert.equal((await visit('bad_id')).status, 400)

  const response = await handleSvgKitsRequest(
    new Request('https://example.test/api/svg-kits/stats/views'), writable.store, seed.store, opts,
  )
  assert.equal(response.status, 200)
  assert.equal(response.headers.get('cache-control'), 'no-store')
  assert.deepEqual(await response.json(), { live: 2, seeded: 1 })
  assert.equal(writable.calls.putTheme, 0)
})

function unlistRequest(body: unknown, token: string | null = TOKEN) {
  const headers: Record<string, string> = { 'content-type': 'application/json' }
  if (token) headers.authorization = `Bearer ${token}`
  return new Request('https://example.test/api/svg-kits/unlist', {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })
}

test('unlist drops index ids once, keeps manifests, and ignores ids already absent', async () => {
  const writable = memoryStore({ backend: 'r2', writable: true }, [
    theme('egyptian', ['ra']),
    theme('jackalope-prairie-cryptid', ['hare']),
    theme('celtic-slavic', ['knot']),
  ])
  const seed = memoryStore({ backend: 'seed', writable: false })
  const opts = { adminToken: TOKEN, setupHint: SETUP }
  const body = {
    slugs: ['jackalope-prairie-cryptid', 'already-gone', 'jackalope-prairie-cryptid'],
    protect: ['egyptian', 'celtic-slavic'],
  }

  const first = await handleSvgKitsRequest(unlistRequest(body), writable.store, seed.store, opts)
  assert.equal(first.status, 200)
  const listed = (await first.json()) as UnlistResult & { ok: boolean }
  assert.equal(listed.ok, true)
  assert.deepEqual(listed.removed, ['jackalope-prairie-cryptid'])
  assert.deepEqual(listed.absent, ['already-gone'])
  assert.deepEqual(listed.themes, ['egyptian', 'celtic-slavic'])
  assert.equal(writable.manifests.has('jackalope-prairie-cryptid'), true)
  assert.equal(writable.calls.indexWrites, 1)

  const again = await handleSvgKitsRequest(unlistRequest(body), writable.store, seed.store, opts)
  assert.equal(again.status, 200)
  const repeat = (await again.json()) as UnlistResult
  assert.deepEqual(repeat.removed, [])
  assert.deepEqual(repeat.absent, ['jackalope-prairie-cryptid', 'already-gone'])
  assert.deepEqual(repeat.themes, ['egyptian', 'celtic-slavic'])
  assert.equal(writable.calls.indexWrites, 1)
  assert.equal(writable.calls.unlist, 2)
})

test('unlist refuses protected slugs without reading the index', async () => {
  const writable = memoryStore({ backend: 'r2', writable: true }, [theme('egyptian', ['ra'])])
  const seed = memoryStore({ backend: 'seed', writable: false })
  const opts = { adminToken: TOKEN, setupHint: SETUP }

  const response = await handleSvgKitsRequest(
    unlistRequest({ slugs: ['egyptian', 'jackalope-prairie-cryptid'], protect: ['egyptian'] }),
    writable.store,
    seed.store,
    opts,
  )
  assert.equal(response.status, 400)
  assert.deepEqual(await response.json(), {
    error: 'refusing to unlist protected slugs',
    slugs: ['egyptian'],
  })
  assert.equal(writable.calls.unlist, 0)
  assert.deepEqual(writable.index, ['egyptian'])
})

test('unlist requires auth, json, and a protect list', async () => {
  const writable = memoryStore({ backend: 'r2', writable: true }, [theme('egyptian', ['ra'])])
  const seed = memoryStore({ backend: 'seed', writable: false })
  const opts = { adminToken: TOKEN, setupHint: SETUP }

  const denied = await handleSvgKitsRequest(unlistRequest({ slugs: ['egyptian'], protect: [] }, null), writable.store, seed.store, opts)
  assert.equal(denied.status, 401)

  const wrong = await handleSvgKitsRequest(unlistRequest({ slugs: ['egyptian'], protect: [] }, 'nope'), writable.store, seed.store, opts)
  assert.equal(wrong.status, 401)

  const text = await handleSvgKitsRequest(
    new Request('https://example.test/api/svg-kits/unlist', {
      method: 'POST',
      headers: { authorization: `Bearer ${TOKEN}`, 'content-type': 'text/plain' },
      body: '{}',
    }),
    writable.store,
    seed.store,
    opts,
  )
  assert.equal(text.status, 415)

  const missing = await handleSvgKitsRequest(unlistRequest({ slugs: ['jackalope-prairie-cryptid'] }), writable.store, seed.store, opts)
  assert.equal(missing.status, 400)
  assert.equal(writable.calls.unlist, 0)
})

test('index update retries after a lost etag and keeps the concurrent id', async () => {
  let themes = ['egyptian', 'jackalope-prairie-cryptid']
  let etag = '1'
  const writes: string[][] = []
  let races = 0
  const next = await updateIndex(
    async () => ({ themes: [...themes], etag }),
    async (proposed, seen) => {
      writes.push(proposed)
      if (races === 0 && seen === '1') {
        races += 1
        themes = [...themes, 'world-dragons']
        etag = '2'
        return false
      }
      assert.equal(seen, etag)
      themes = proposed
      etag = '3'
      return true
    },
    (ids) => {
      const plan = planUnlist(ids, ['jackalope-prairie-cryptid'])
      return plan.changed ? plan.themes : null
    },
  )
  assert.deepEqual(next, ['egyptian', 'world-dragons'])
  assert.deepEqual(themes, ['egyptian', 'world-dragons'])
  assert.equal(writes.length, 2)
})

test('local unlist removes index ids and leaves the theme directory in place', async () => {
  const root = mkdtempSync(join(tmpdir(), 'fx-lab-unlist-'))
  try {
    const store = new FsKitStore(root, { backend: 'local', writable: true })
    const kept = theme('egyptian', ['ra'])
    const absorbed = theme('jackalope-prairie-cryptid', ['hare'])
    await store.putTheme(kept)
    await store.putTheme(absorbed)
    const manifest = join(store.themeDir(absorbed.id), 'manifest.json')

    const first = await store.unlistThemes([absorbed.id, 'already-gone'])
    assert.deepEqual(first.removed, [absorbed.id])
    assert.deepEqual(first.absent, ['already-gone'])
    assert.deepEqual(first.themes, ['egyptian'])
    assert.equal(existsSync(manifest), true)
    assert.equal(JSON.parse(readFileSync(join(root, 'index.json'), 'utf8')).themes.includes(absorbed.id), false)

    const again = await store.unlistThemes([absorbed.id])
    assert.deepEqual(again.removed, [])
    assert.deepEqual(again.absent, [absorbed.id])
    assert.equal(existsSync(manifest), true)
    const fetched = await store.get(absorbed.id)
    assert.equal(fetched?.id, absorbed.id)
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})

test('unconfigured or failing view storage leaves theme browsing available', async () => {
  const seed = memoryStore({ backend: 'seed', writable: false }, [theme('seeded', ['a'])])
  const request = new Request('https://example.test/api/svg-kits/stats/views')
  const opts = { setupHint: SETUP }
  const unavailable = await handleSvgKitsRequest(request, seed.store, seed.store, opts)
  assert.equal(unavailable.status, 503)

  const failing = await handleSvgKitsRequest(request, seed.store, seed.store, {
    ...opts,
    views: {
      async readViews() { throw new Error('database unavailable') },
      async recordView() { throw new Error('database unavailable') },
    },
  })
  assert.equal(failing.status, 500)
  const themeResponse = await handleSvgKitsRequest(
    new Request('https://example.test/api/svg-kits/seeded'), seed.store, seed.store, opts,
  )
  assert.equal(themeResponse.status, 200)
})
