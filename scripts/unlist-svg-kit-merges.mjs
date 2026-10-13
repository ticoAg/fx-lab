#!/usr/bin/env node
// 一次调用 POST /api/svg-kits/unlist，把 merges/catalog.json 里被并入的 id 从 index.json 摘掉。
// 不删除 R2 的 themes/<slug>/。已经不在 index 里的 id 再跑一次也是成功。
//
// 默认只演练，不带管理口令，也不 POST。
//
//   node scripts/unlist-svg-kit-merges.mjs
//   SVG_KITS_ADMIN_TOKEN=... node scripts/unlist-svg-kit-merges.mjs --apply
//
// protect 里是这 17 个合并主题（PUT 用的 slug）以及不参与合并的总览主题。
// 其中任何一个出现在待摘列表里，脚本和接口都会整批拒绝，index 不动。

import { readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

const ROOT = resolve(new URL('..', import.meta.url).pathname)
const API = (process.env.SVG_KITS_API || 'https://fx-lab.ticoag.fun').replace(/\/$/, '')
const CDN = (process.env.SVG_KITS_CDN || 'https://fx-lab-cdn.ticoag.fun').replace(/\/$/, '')
const OVERVIEW = ['celtic-slavic', 'european-myth', 'african', 'americas', 'eastern-myth']
const EXPECTED = 105

const apply = process.argv.includes('--apply')
const catalog = JSON.parse(readFileSync(join(ROOT, 'merges/catalog.json'), 'utf8'))

const protect = []
const slugs = []
const seenProtect = new Set()
const seenSlugs = new Set()
for (const id of OVERVIEW) {
  if (!seenProtect.has(id)) {
    seenProtect.add(id)
    protect.push(id)
  }
}
for (const group of catalog.groups) {
  if (!seenProtect.has(group.slug)) {
    seenProtect.add(group.slug)
    protect.push(group.slug)
  }
  for (const id of group.absorbed) {
    if (seenSlugs.has(id)) continue
    seenSlugs.add(id)
    slugs.push(id)
  }
}

const blocked = slugs.filter((id) => seenProtect.has(id))
if (blocked.length) {
  console.error(`待摘列表含有受保护 slug，已停止：${blocked.join(', ')}`)
  process.exit(1)
}
if (slugs.length !== EXPECTED) {
  console.error(`catalog 里被并入的 id 是 ${slugs.length} 个，预期 ${EXPECTED}。`)
  process.exit(1)
}

async function readJson(url) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`${res.status} ${url}`)
  return res.json()
}

async function dryRun() {
  console.log(`演练。将一次摘掉 ${slugs.length} 个 id，保护 ${protect.length} 个。不会 POST。`)
  console.log(`保护：${protect.join(', ')}`)
  const index = await readJson(`${CDN}/index.json?x=${Date.now()}`)
  const listed = new Set(index.themes ?? [])
  const present = slugs.filter((id) => listed.has(id))
  const absent = slugs.filter((id) => !listed.has(id))
  const missingProtect = protect.filter((id) => !listed.has(id))
  console.log(`CDN index 现有 ${listed.size} 个。待摘的里面还有 ${present.length} 个，已经不在的有 ${absent.length} 个。`)
  if (absent.length) console.log(`已经不在 index：${absent.join(', ')}`)
  if (missingProtect.length) console.log(`! 保护名单里这些 id 当前不在 CDN index：${missingProtect.join(', ')}`)
  console.log('正式摘除：SVG_KITS_ADMIN_TOKEN=... node scripts/unlist-svg-kit-merges.mjs --apply')
}

async function applyUnlist() {
  const token = process.env.SVG_KITS_ADMIN_TOKEN
  if (!token) {
    console.error('缺少 SVG_KITS_ADMIN_TOKEN。演练不需要口令。')
    process.exit(1)
  }
  const res = await fetch(`${API}/api/svg-kits/unlist`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${token}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({ slugs, protect }),
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) {
    console.error(`unlist ${res.status} ${JSON.stringify(body).slice(0, 800)}`)
    process.exit(1)
  }
  const themes = new Set(body.themes ?? [])
  const stillListed = slugs.filter((id) => themes.has(id))
  const droppedProtect = protect.filter((id) => !themes.has(id))
  console.log(`摘掉 ${body.removed?.length ?? 0} 个，本来就不在的 ${body.absent?.length ?? 0} 个，index 剩 ${themes.size} 个。`)
  if (stillListed.length) {
    console.error(`index 里还有被并入的 id：${stillListed.join(', ')}`)
    process.exit(1)
  }
  if (droppedProtect.length) {
    console.error(`保护 slug 不在返回的 index 里：${droppedProtect.join(', ')}`)
    process.exit(1)
  }
  let missingDir = 0
  for (const id of slugs) {
    const probe = await fetch(`${API}/api/svg-kits/${id}`)
    if (!probe.ok) {
      missingDir += 1
      console.error(`themes/${id}/ 读不到了（${probe.status}）。unlist 不应该删目录。`)
    }
  }
  if (missingDir) process.exit(1)
  console.log(`${slugs.length} 个旧目录都还在。画廊读的是 CDN index，缓存最多一天；要马上生效得按 docs/deploy.md 清 index.json 的缓存。`)
}

if (apply) await applyUnlist()
else await dryRun()
