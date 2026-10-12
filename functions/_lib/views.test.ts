import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { promisify } from 'node:util'
import { FsKitStore } from '../../scripts/lib/svg-kits-fs-store.ts'
import { validateSvgKitViews } from './model.ts'
import { d1ViewsStore, type SvgKitViewsDatabase } from './views.ts'

const execute = promisify(execFile)

test('D1 upsert preserves concurrent increments and keeps themes separate', async () => {
  const root = await mkdtemp(join(tmpdir(), 'fx-lab-views-'))
  const dbFile = join(root, 'views.sqlite')
  const query = async (sql: string) => {
    const { stdout } = await execute('sqlite3', ['-cmd', '.timeout 5000', '-json', dbFile, sql])
    return stdout
  }
  try {
    await query(await readFile(new URL('../../migrations/0001_svg_kit_views.sql', import.meta.url), 'utf8'))
    // Execute the production SQL in SQLite; only the D1 transport is replaced.
    const db: SvgKitViewsDatabase = {
      prepare(sql) {
        return {
          async all<T>() { return { results: JSON.parse(await query(sql) || '[]') as T[] } },
          bind(value) {
            return { run: () => query(sql.replace('?1', `'${value.replaceAll("'", "''")}'`)) }
          },
        }
      },
    }
    const store = d1ViewsStore(db)
    assert.deepEqual({ ...await store.readViews() }, {})
    await Promise.all(Array.from({ length: 20 }, () => store.recordView('popular')))
    await store.recordView('other')
    assert.deepEqual({ ...await d1ViewsStore(db).readViews() }, { popular: 20, other: 1 })
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test('local view counts survive reopening the store and concurrent requests', async () => {
  const root = await mkdtemp(join(tmpdir(), 'fx-lab-local-views-'))
  try {
    const store = new FsKitStore(root, { backend: 'local', writable: true })
    assert.deepEqual({ ...await store.readViews() }, {})
    await Promise.all(Array.from({ length: 10 }, () => store.recordView('basics')))
    await store.recordView('constructor')
    const reopened = new FsKitStore(root, store.info)
    assert.deepEqual({ ...await reopened.readViews() }, { basics: 10, constructor: 1 })
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test('view validation rejects malformed responses instead of producing invalid rankings', () => {
  assert.deepEqual({ ...validateSvgKitViews({ basics: 0, forest: 12 }) }, { basics: 0, forest: 12 })
  assert.equal(validateSvgKitViews({}).constructor, undefined)
  for (const input of [null, [], { forest: -1 }, { forest: 1.5 }, { forest: '12' }, { bad_id: 1 }, { forest: Infinity }]) {
    assert.throws(() => validateSvgKitViews(input), /invalid theme views/)
  }
})
