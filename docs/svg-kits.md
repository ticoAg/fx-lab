# SVG Kits 存储与上传

新主题从网站上传，不维护进 git。Git 只放应用代码，加上一份一次性种子（`seed/svg-kits/`：basics、cthulhu-mythos）。

## 线上怎么读

公开页 `GET /api/svg-kits`、`GET /api/svg-kits/:themeId`、图标 `GET /api/svg-kits/:themeId/icons/:id.svg`。

Pages Function 在 `functions/api/svg-kits/[[path]].ts`：

1. 若绑定了 R2（`SVG_KITS`），读写桶里的 JSON manifest + SVG。
2. 若没有绑定，GET 回退到构建进 dist 的种子文件（`/seed-svg-kits/`），画廊仍能看 basics / cthulhu-mythos。写入返回 503，提示绑定 R2。

本地 `npm run dev` 用 Vite 插件实现同一套 API，可写目录是 `.data/svg-kits/`（gitignore）。第一次启动会把种子拷进去。

## 上传

打开 `/svg-kits/admin`：

1. 填管理口令（本地默认 `dev`，可用 `SVG_KITS_ADMIN_TOKEN` 覆盖）。
2. 建主题：kebab-case id，zh/en 标题和描述，可选分类。
3. 一次选择多个 `.svg`，为每个图标填 zh/en 标题和描述。
4. 保存。资源进 R2（生产）或 `.data/svg-kits`（本地）。

把种子写入可写存储（覆盖同 id）：

- 管理页按钮「写入 basics + cthulhu-mythos 种子」→ `POST /api/svg-kits/seed`
- 或 `npm run seed:svg-kits`
- 或 `SVG_KITS_ADMIN_TOKEN=... npm run seed:svg-kits -- --api https://fx-lab-5do.pages.dev`

## 生产要做的一次性 Cloudflare 配置

现在可以只上画廊：不绑 R2 时，Pages 用种子静态文件，`/svg-kits`、`/svg-kits/basics`、`/svg-kits/cthulhu-mythos` 能看。**上传要等下面做完。**

1. 在 Cloudflare 建 R2 桶，建议名 `fx-lab-svg-kits`（不必公开）。
2. Pages 项目 **fx-lab** → Settings → Bindings → R2：绑定名必须是 `SVG_KITS`，桶选上一步。
3. 同一页加环境变量 `SVG_KITS_ADMIN_TOKEN`（生产口令，不要用 `dev`）。
4. 也可把绑定写进 `wrangler.toml`（不要加 `[build]` 表）：

```
[[r2_buckets]]
binding = "SVG_KITS"
bucket_name = "fx-lab-svg-kits"
```

5. 重新部署后再打开 `/svg-kits/admin`，用口令执行一次种子写入，或直接上传新主题。

可选：给管理页加 Cloudflare Access，只让自己进 `/svg-kits/admin`。API 仍校验 Bearer token。

## 种子目录（不要往这里加新主题）

```
seed/svg-kits/index.json
seed/svg-kits/<themeId>/manifest.json    # zh/en 文案
seed/svg-kits/<themeId>/icons/<id>.svg
seed/svg-kits/<themeId>/elements.svg     # 可选总览
```

`npm run check:svg-kits` 只校验这份种子。`npm run build` 会先跑它。
