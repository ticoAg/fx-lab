# 发布这 17 组（给 Publisher）

不要在制作环境里发布。管理口令只放在 Publisher 那一台。

17 个合并主题已经 PUT 上线，301 也已经生效。还没做的是把 105 个被并入的旧 id 从 `index.json` 摘掉。用 `scripts/unlist-svg-kit-merges.mjs`，不要 DELETE，也不要再跑下面的 `--apply`（那会重传主题，并且还想用 Wrangler 改 index）。

## 从 index 摘掉已并入的 id

接口是 `POST /api/svg-kits/unlist`，要管理口令。body：

```json
{ "slugs": ["jackalope-prairie-cryptid"], "protect": ["egyptian", "world-dragons"] }
```

一次请求读一次 `index.json`、改一次、写一次。和并发的 PUT 抢写时用对象的 etag 重读再写，避免把对方刚加进列表的 id 盖掉。已经不在 index 里的 slug 记在 `absent` 里，仍返回成功。`slugs` 里如果出现 `protect` 中的任何一个，整批拒绝，index 不动。这个操作不删除 `themes/<slug>/`。

`protect` 至少要带上 PUT 用过的 17 个合并 slug。脚本另外加上不参与合并的总览：`celtic-slavic`、`european-myth`、`african`、`americas`、`eastern-myth`。

演练（不 POST）：

```bash
node scripts/unlist-svg-kit-merges.mjs
```

部署到生产之后，由 Publisher 执行：

```bash
SVG_KITS_ADMIN_TOKEN=... node scripts/unlist-svg-kit-merges.mjs --apply
```

脚本会核对：105 个旧 id 都离开了返回的 index，17 个合并 slug 和总览都还在，并且每个旧 slug 的 `GET /api/svg-kits/<slug>` 仍是 200。画廊读的是 CDN 上的 `index.json`，缓存一天。要马上从列表里消失，按 [docs/deploy.md](../docs/deploy.md) 清 `index.json` 的三份缓存（不带 Origin，以及两个站点 Origin）。清缓存前先征得同意。

## 当初怎么 PUT 的

本段对应 `scripts/publish-svg-kit-merges.mjs`。主题已经在线上时不要为了摘 index 再跑它。

包在 `merges/<slug>/`：`manifest.json`、`icons/*.svg`、`all.png`、`README.md`（调色板）、`base_hash.txt`。`all.png` 和 README 不上传。

## 演练

在仓库根目录：

```bash
node scripts/publish-svg-kit-merges.mjs
```

会去读 CDN 的 `index.json?x=...`，按组打印「去掉哪些 id、列表从多少变成多少」。不 PUT，不写 R2。

## 正式发布

一次只跑一个进程。组与组之间串行：先 PUT 这一组，再改 `index.json`，再核对，然后才是下一组。

```bash
SVG_KITS_ADMIN_TOKEN=... node scripts/publish-svg-kit-merges.mjs --apply
```

从中途接着做（例如前 7 组已经上线）：

```bash
SVG_KITS_ADMIN_TOKEN=... node scripts/publish-svg-kit-merges.mjs --apply --from 8
```

脚本会做这些事：

1. 沿用旧 slug 的组，先拿 CDN 上该 slug 的 `manifest.json` 算 sha256，和包里的 `base_hash.txt` 比。不一致就停，不覆盖。新建 slug 的 `base_hash` 是 `none`，不做这步。
2. `PUT https://fx-lab.ticoag.fun/api/svg-kits/<slug>`，body 是 `{ theme, files }`。若线上图标 id 已经和包一致，跳过 PUT（方便某组写到一半后续跑）。
3. 这一步原来用 Wrangler 改 `index.json`。没有 Cloudflare 凭据时会失败，而且主题已经 PUT 过。摘掉旧 id 改走上面的 `unlist`。
4. 不调用 `DELETE`。`themes/<旧 slug>/` 留在桶里。

## 缓存

默认不清 CDN。`index.json` 和 manifest 缓存一天，见 `docs/deploy.md`。主人同意后再：

```bash
SVG_KITS_ADMIN_TOKEN=... CF_ZONE_ID=... CF_API_TOKEN=... \
  node scripts/publish-svg-kit-merges.mjs --apply --purge
```

每个 URL 会清三份：不带 Origin、带 `https://fx-lab.ticoag.fun`、带 `https://fx-lab-5do.pages.dev`。

`public/_redirects` 里的 301 随 Pages 部署生效，不走这支脚本。旧 slug 共 105 条，写在 `/* /index.html 200` 之前。`celtic-slavic` 没有重定向。
