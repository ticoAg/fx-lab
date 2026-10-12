# SVG Kits 存储与上传

新主题从网站上传。Git 里的种子是 `seed/svg-kits/`：basics、cthulhu-mythos，以及 pastoral、line-basics、druid、forest（透明底，主描边 `currentColor`）。healing 没有这套图标，不在种子里。线上若已有同名主题，R2 会盖过种子，合并后需要把种子再写入 R2。

## 线上怎么读

公开页 `GET /api/svg-kits`、`GET /api/svg-kits/:themeId`、图标 `GET /api/svg-kits/:themeId/icons/:id.svg`。

Pages Function 在 `functions/api/svg-kits/[[path]].ts`：

1. 若绑定了 R2（`SVG_KITS`），读写桶里的 JSON manifest + SVG。
2. 若没有绑定，GET 回退到构建进 dist 的种子文件（`/seed-svg-kits/`），画廊仍能看 basics / cthulhu-mythos。写入返回 503，提示绑定 R2。

线上浏览页不调用这个 API：图标、manifest 和 `index.json` 直接从 R2 的 CDN 域名 `https://fx-lab-cdn.ticoag.fun` 读（缓存 1 天），种子主题从 `/seed-svg-kits/` 读，CDN 失败才回退到 API。管理页始终用 API。详见 [deploy.md](deploy.md#cdn-与缓存)。

本地 `npm run dev` 用 Vite 插件实现同一套 API，可写目录是 `.data/svg-kits/`（gitignore）。第一次启动会把种子拷进去。

## 上传

打开 `/svg-kits/admin`：

1. 填管理口令（本地默认 `dev`，可用 `SVG_KITS_ADMIN_TOKEN` 覆盖）。
2. 建主题：kebab-case id，zh/en 标题和描述，选类别（见下），可选分类。
3. 一次选择多个 `.svg`，为每个图标填 zh/en 标题和描述。
4. 保存。资源进 R2（生产）或 `.data/svg-kits`（本地）。

把种子写入可写存储（覆盖同 id）：

- 管理页按钮「写入全部种子主题」→ `POST /api/svg-kits/seed`
- 或 `npm run seed:svg-kits`
- 或 `SVG_KITS_ADMIN_TOKEN=... npm run seed:svg-kits -- --api https://fx-lab.ticoag.fun`

## 主题类别

manifest 的 `kind` 字段区分两类主题，列表页可按类别筛选：

| `kind` | 显示名 | 用途 | 单个图标文件上限 |
| --- | --- | --- | --- |
| `icon`（不写时的默认值） | 轻量图标 | 界面里的小图标 | 24 KB，200 个元素 |
| `illustration` | 精美插画 | 细节多的插画、装饰图 | 160 KB，2500 个元素 |

元素数按开始标签计数。上限定义在 `functions/_lib/model.ts` 的 `SVG_KIT_BUDGETS`，前端从那里引用。上传时只检查本次请求带的文件，超限返回 400；已存进 R2 的文件不回头检查。`npm run check:svg-kits` 对种子做同样的检查。图标文件还受 10 MB 的通用上限（`functions/_lib/http.ts` 的 `MAX_SVG_BYTES`）。

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

## 种子目录

`npm run build:svg-kits` 去掉圆角底板，并把 pastoral / line-basics / druid / forest 的主描边改成 `currentColor`。目录不存在的 healing 会被跳过。之后不要再往种子里堆全新主题，走上传页。

```
seed/svg-kits/index.json
seed/svg-kits/<themeId>/manifest.json    # zh/en 文案
seed/svg-kits/<themeId>/icons/<id>.svg
```

`npm run check:svg-kits` 只校验这份种子。`npm run build` 会先跑它。
