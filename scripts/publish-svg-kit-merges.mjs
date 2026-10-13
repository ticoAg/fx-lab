#!/usr/bin/env node
// 串行发布 merges/ 下的 17 组 SVG Kits 合并包，并改写 R2 的 index.json。
//
// 默认只演练，不访问管理接口，也不写 R2。
// 正式发布由持有 SVG_KITS_ADMIN_TOKEN 的 Publisher 执行，本仓库的制作流程不会代跑。
//
//   node scripts/publish-svg-kit-merges.mjs                 # 演练
//   SVG_KITS_ADMIN_TOKEN=... node scripts/publish-svg-kit-merges.mjs --apply
//   node scripts/publish-svg-kit-merges.mjs --apply --from 8   # 从第 8 组接着做
//
// 每一组的顺序固定为：核对 base_hash → PUT 该组主题 → 立刻重写 index.json。
// index.json 只去掉这一组被并入的 id，并保证合并后的 slug 在列表里。
// 不调用 DELETE，不删除 themes/<旧 slug>/。旧目录留着，给还在引用 CDN 旧路径的地方兜底。
//
// 从 index.json 摘掉被并入的 id 不要再用 Wrangler，也不要 DELETE。
// 部署了 POST /api/svg-kits/unlist 之后，用 scripts/unlist-svg-kit-merges.mjs。
// 下面的 --apply 仍会在每组 PUT 之后尝试用 Wrangler 改 index；没有 Cloudflare 凭据时这一步会失败。
// 主题已经 PUT 过的话，不要为了摘 index 再跑 --apply。
//
// 清 CDN 缓存不在默认步骤里。index.json 和 manifest 会缓存一天，见 docs/deploy.md。
// 主人点头之后再加 --purge（还要 CF_ZONE_ID 和 CF_API_TOKEN）。

import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

const ROOT = resolve(new URL('..', import.meta.url).pathname)
const API = (process.env.SVG_KITS_API || 'https://fx-lab.ticoag.fun').replace(/\/$/, '')
const CDN = (process.env.SVG_KITS_CDN || 'https://fx-lab-cdn.ticoag.fun').replace(/\/$/, '')
const BUCKET = process.env.SVG_KITS_BUCKET || 'fx-lab-svg-kits'
const PROTECTED = ['celtic-slavic', 'european-myth', 'african', 'americas', 'eastern-myth']

const apply = process.argv.includes('--apply')
const purge = process.argv.includes('--purge')
const fromArg = process.argv.indexOf('--from')
const fromGroup = fromArg >= 0 ? Number(process.argv[fromArg + 1]) : 1
if (!Number.isInteger(fromGroup) || fromGroup < 1) {
  console.error('--from 后面要写组号（1–17）')
  process.exit(1)
}

const catalog = JSON.parse(readFileSync(join(ROOT, 'merges/catalog.json'), 'utf8'))
const groups = catalog.groups.filter((group) => group.group >= fromGroup)

function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex')
}

async function readJson(url) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`${res.status} ${url}`)
  return res.json()
}

function packageTheme(dir) {
  const theme = JSON.parse(readFileSync(join(dir, 'manifest.json'), 'utf8'))
  const files = {}
  for (const icon of theme.icons) {
    files[icon.id] = readFileSync(join(dir, 'icons', `${icon.id}.svg`), 'utf8')
  }
  return { theme, files }
}

function sameIcons(live, theme) {
  if (!live || !Array.isArray(live.icons) || live.icons.length !== theme.icons.length) return false
  return live.icons.every((icon, index) => icon.id === theme.icons[index].id) && live.cover === theme.cover
}

function rewriteIndex(ids, group) {
  const absorbed = new Set(group.absorbed)
  if (absorbed.has(group.slug)) throw new Error(`${group.slug} 被算进了要删除的 id`)
  for (const id of PROTECTED) {
    if (absorbed.has(id)) throw new Error(`拒绝从 index 去掉受保护主题 ${id}`)
  }
  const removed = ids.filter((id) => absorbed.has(id))
  const next = ids.filter((id) => !absorbed.has(id))
  if (!next.includes(group.slug)) next.push(group.slug)
  for (const id of PROTECTED) {
    if (ids.includes(id) && !next.includes(id)) throw new Error(`改写后丢掉了 ${id}`)
  }
  const unexpected = ids.filter((id) => !next.includes(id) && !absorbed.has(id))
  if (unexpected.length) throw new Error(`改写多删了 ${unexpected.join(', ')}`)
  return { next, removed }
}

function wrangler(args) {
  execFileSync('npx', ['--yes', 'wrangler', ...args], { stdio: 'inherit' })
}

function readR2Index(dir) {
  const file = join(dir, 'index.json')
  wrangler(['r2', 'object', 'get', `${BUCKET}/index.json`, '--file', file, '--remote'])
  const data = JSON.parse(readFileSync(file, 'utf8'))
  if (!Array.isArray(data.themes)) throw new Error('R2 index.json 没有 themes 数组')
  return data.themes
}

function writeR2Index(dir, themes) {
  const file = join(dir, 'index.next.json')
  writeFileSync(file, JSON.stringify({ themes }, null, 2) + '\n')
  wrangler([
    'r2', 'object', 'put', `${BUCKET}/index.json`,
    '--file', file,
    '--content-type', 'application/json',
    '--remote',
  ])
}

async function putTheme(group) {
  const dir = join(ROOT, group.package)
  const { theme, files } = packageTheme(dir)
  if (theme.id !== group.slug) throw new Error(`${group.package} 的 id 不是 ${group.slug}`)
  const liveRes = await fetch(`${API}/api/svg-kits/${group.slug}`)
  const live = liveRes.ok ? (await liveRes.json()).theme : null
  if (sameIcons(live, theme)) {
    console.log(`  PUT 跳过：线上图标 id 已与包一致（${theme.icons.length}）`)
    return theme
  }
  if (!group.new) {
    const expected = readFileSync(join(dir, 'base_hash.txt'), 'utf8').trim()
    const raw = await fetch(`${CDN}/themes/${group.slug}/manifest.json?x=${Date.now()}`).then((res) => {
      if (!res.ok) throw new Error(`拉不到线上 manifest ${group.slug}: ${res.status}`)
      return res.arrayBuffer()
    })
    const actual = sha256(Buffer.from(raw))
    if (actual !== expected) {
      throw new Error(
        `${group.slug} 的线上 manifest sha256 已变。\n  开工时 ${expected}\n  现在 ${actual}\n  不要覆盖。先看是谁改过；确认仍要发布再单独处理这一组。`,
      )
    }
  }
  const token = process.env.SVG_KITS_ADMIN_TOKEN
  if (!token) throw new Error('缺少 SVG_KITS_ADMIN_TOKEN')
  const res = await fetch(`${API}/api/svg-kits/${group.slug}`, {
    method: 'PUT',
    headers: {
      authorization: `Bearer ${token}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({ theme, files }),
  })
  const body = await res.text()
  if (!res.ok) throw new Error(`PUT ${group.slug} ${res.status} ${body.slice(0, 500)}`)
  console.log(`  PUT ${group.slug} → ${res.status}，${theme.icons.length} 件`)
  return theme
}

async function verifyGroup(group, themes) {
  const theme = await readJson(`${API}/api/svg-kits/${group.slug}`).then((body) => body.theme)
  if (!theme || theme.icons.length !== group.count) {
    throw new Error(`${group.slug} 线上件数 ${theme?.icons?.length}，包内 ${group.count}`)
  }
  for (const old of group.absorbed) {
    const res = await fetch(`${API}/api/svg-kits/${old}`)
    if (!res.ok) throw new Error(`旧目录 themes/${old}/ 读不到了（${res.status}）。本脚本不应删除它。`)
    if (themes.includes(old)) throw new Error(`index.json 仍含有已并入的 ${old}`)
  }
  if (!themes.includes(group.slug)) throw new Error(`index.json 没有 ${group.slug}`)
  for (const id of PROTECTED) {
    if (!themes.includes(id)) throw new Error(`index.json 丢掉了受保护主题 ${id}`)
  }
  console.log(`  核对通过：${group.slug} ${theme.icons.length} 件；${group.absorbed.length} 个旧目录仍在，且已离开 index`)
}

async function purgeCaches(groupsDone) {
  const zone = process.env.CF_ZONE_ID
  const token = process.env.CF_API_TOKEN
  if (!zone || !token) throw new Error('清缓存需要 CF_ZONE_ID 和 CF_API_TOKEN。见 docs/deploy.md')
  const files = []
  const push = (url) => {
    files.push(url)
    files.push({ url, headers: { Origin: 'https://fx-lab.ticoag.fun' } })
    files.push({ url, headers: { Origin: 'https://fx-lab-5do.pages.dev' } })
  }
  push(`${CDN}/index.json`)
  for (const group of groupsDone) {
    push(`${CDN}/themes/${group.slug}/manifest.json`)
    for (const old of group.absorbed) push(`${CDN}/themes/${old}/manifest.json`)
  }
  for (let i = 0; i < files.length; i += 30) {
    const chunk = files.slice(i, i + 30)
    const res = await fetch(`https://api.cloudflare.com/client/v4/zones/${zone}/purge_cache`, {
      method: 'POST',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: JSON.stringify({ files: chunk }),
    })
    const body = await res.json()
    if (!res.ok || body.success === false) throw new Error(`清缓存失败 ${res.status} ${JSON.stringify(body).slice(0, 400)}`)
    console.log(`  已清 ${chunk.length} 个缓存 URL`)
  }
}

async function dryRun() {
  const index = await readJson(`${CDN}/index.json?x=${Date.now()}`)
  let ids = index.themes.slice()
  console.log(`演练。CDN index 现有 ${ids.length} 个主题。不会 PUT，也不会写 R2。`)
  for (const id of PROTECTED) {
    if (!ids.includes(id)) console.log(`! 保护名单里的 ${id} 当前不在 CDN index`)
  }
  for (const group of groups) {
    const { next, removed } = rewriteIndex(ids, group)
    const added = ids.includes(group.slug) ? '沿用' : '新增'
    console.log(
      `组 ${group.group} ${group.slug}（${added}，${group.count} 件）去掉 ${removed.length} 个：${removed.join(', ') || '（无）'} → index ${ids.length} → ${next.length}`,
    )
    ids = next
  }
  console.log(`演练结束。若从完整 index 跑完全部组，大约剩下 ${ids.length} 个主题。`)
  console.log('正式发布：SVG_KITS_ADMIN_TOKEN=... node scripts/publish-svg-kit-merges.mjs --apply')
  console.log('一次只跑一个进程。旧目录 themes/<旧>/ 不会删除。')
}

async function applyAll() {
  if (!process.env.SVG_KITS_ADMIN_TOKEN) {
    console.error('缺少 SVG_KITS_ADMIN_TOKEN。演练不需要口令；--apply 需要。')
    process.exit(1)
  }
  const work = mkdtempSync(join(tmpdir(), 'fx-lab-merge-index-'))
  console.log(`正式发布，从第 ${fromGroup} 组起，共 ${groups.length} 组。只覆盖 index.json，不删除旧主题目录。`)
  try {
    for (const group of groups) {
      console.log(`\n组 ${group.group} ${group.slug}`)
      await putTheme(group)
      const current = readR2Index(work)
      const { next, removed } = rewriteIndex(current, group)
      writeR2Index(work, next)
      console.log(`  index.json ${current.length} → ${next.length}，去掉 ${removed.join(', ') || '（无）'}`)
      const written = readR2Index(work)
      await verifyGroup(group, written)
    }
    if (purge) await purgeCaches(groups)
    else console.log('\n未清 CDN 缓存。主人同意后再加 --purge，否则最多一天后才在画廊里看到新列表。')
  } finally {
    rmSync(work, { recursive: true, force: true })
  }
}

if (apply) await applyAll()
else await dryRun()
