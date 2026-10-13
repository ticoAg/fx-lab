# 发布这 17 组（给 Publisher）

不要在制作环境里发布。管理口令只放在 Publisher 那一台。本文件对应 `scripts/publish-svg-kit-merges.mjs`。

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
3. 用 Wrangler 读 R2 桶 `fx-lab-svg-kits` 的 `index.json`，去掉这一组被并入的 id，放上合并后的 slug，再写回。只覆盖这一个对象。
4. 不调用 `DELETE`。`themes/<旧 slug>/` 留在桶里。
5. 用 API 核对：新主题件数等于包内件数；每个旧 slug 的 manifest 仍返回 200；index 里不再有这些旧 id；`celtic-slavic`、`european-myth`、`african`、`americas`、`eastern-myth` 还在。

Publisher 机器要能跑 `npx wrangler r2 object get/put ... --remote`（已 `wrangler login`，或设了 `CLOUDFLARE_API_TOKEN` 和 `CLOUDFLARE_ACCOUNT_ID`）。

## 缓存

默认不清 CDN。`index.json` 和 manifest 缓存一天，见 `docs/deploy.md`。主人同意后再：

```bash
SVG_KITS_ADMIN_TOKEN=... CF_ZONE_ID=... CF_API_TOKEN=... \
  node scripts/publish-svg-kit-merges.mjs --apply --purge
```

每个 URL 会清三份：不带 Origin、带 `https://fx-lab.ticoag.fun`、带 `https://fx-lab-5do.pages.dev`。

`public/_redirects` 里的 301 随 Pages 部署生效，不走这支脚本。旧 slug 共 105 条，写在 `/* /index.html 200` 之前。`celtic-slavic` 没有重定向。
