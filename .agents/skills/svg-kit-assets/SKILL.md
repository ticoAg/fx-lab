---
name: svg-kit-assets
description: Create a new fx-lab SVG kit theme, or enrich / refine / redraw an existing one (add icons, raise quality), then validate and publish it. USE FOR "新建素材/新主题", "补充、丰富、优化这组素材", "扩展主题", "更高的质量", "重绘图标", a /svg-kits/<themeId> URL, seed/svg-kits or R2 themes, manifest.json + icons/*.svg, currentColor strokes, kit animations (float/sway/spin/pulse/pop), budget or margin failures. DO NOT USE FOR svg-kits page UI or React code changes (edit src/ directly), Cloudflare/R2 infrastructure setup (docs/deploy.md), or non-kit SVGs in public/.
---

# SVG Kit 素材：新建 / 丰富 / 优化

适用仓库：fx-lab（`~/Documents/myws/fx-lab`）。所有命令都在仓库根目录执行。

产出一组能直接上线的 SVG 主题：manifest 与 SVG 文件通过仓库校验和浏览器验收，发布到对应存储，并在线上页面核对过。

## 第 1 步：判断主题在哪、走哪条路

先查，不要猜：

```bash
cat seed/svg-kits/index.json                                      # 种子主题（在 git 里）
curl -s https://fx-lab-cdn.ticoag.fun/index.json                  # R2 主题
curl -s https://fx-lab-5do.pages.dev/api/svg-kits/<id> | head -c 300   # 现行 manifest（{store, theme}）
```

| 情况 | 原稿从哪来 | 写到哪 | 发布方式 |
| --- | --- | --- | --- |
| 在种子里，且 R2 没有同名 | `seed/svg-kits/<id>/`（git 历史就是备份） | 直接改 `seed/svg-kits/<id>/` | 提交并推送 `main`，Pages 自动部署 |
| 在 R2（含同名盖过种子的） | API 的 `theme` 和 `/api/svg-kits/<id>/icons/<icon>.svg` | `artifacts/svg-kits/<id>/`（不提交） | `PUT /api/svg-kits/<id>`，然后清 CDN |
| 全新主题 | 无 | `artifacts/svg-kits/<id>/` | 同 R2。**不要**加进种子，docs/svg-kits.md 规定新主题走上传 |

R2 里有同名主题时会盖过种子，改种子在线上看不到。
种子主题从 `/seed-svg-kits/<id>/` 读。页面会先请求 CDN 的 `themes/<id>/manifest.json`，得到 404 是正常回退，不算错误。

## 第 2 步：工作区与原稿

- 草稿、生成脚本和渲染图都放在 `/tmp/fx-lab-<id>-work/`，不要放进仓库。
- 原稿放在 `/tmp/fx-lab-<id>-work/original/`（manifest 与 `icons/`），供 `--original` 校验比对。
- 种子主题不用另做备份。R2 主题的原稿只存在于线上，要等发布核对完才能删。
- 浏览器依赖装在仓库外：`npm i --prefix /tmp/fx-lab-pw playwright-core --no-audit --no-fund`。脚本会用本机 Chrome。

## 第 3 步：规划清单（先写 manifest，再画）

**优化或重绘已有主题时**
- 已有图标的 `id`、顺序、`title`、`category`、`animation` 都不能改，原有 `tags` 也不能删。
- 主题的 `cover`、`kind`、`sheet` 和已有分类同样不改。可以新增分类和标签。
- 描述按新画面重写；主题描述里的件数必须准确。
- 重绘要真重画：校验器会拒绝复用原稿中超过 40 个字符的 path。

**新增图标时**
- 追加在清单末尾，每个都有中英文标题和描述、`category`、`animation`、`tags`。
- 新图标必须是独立物件，不能只给旧图标换色。描述写画面里实际有什么。

**分类与数量**
- 每个分类大致均衡。用户要"更多内容"时，按数量翻一倍左右规划，并补 1 到 2 个新分类。

**kind 与预算**（`functions/_lib/model.ts` 的 `SVG_KIT_BUDGETS`）

| kind | 硬上限 | 目标 |
| --- | --- | --- |
| `icon` | 24 KB / 200 元素 | ≤20 KB / 180 |
| `illustration` | 160 KB / 2500 元素 | ≤120 KB / 2000 |

## 第 4 步：用生成脚本画，不手写散落的 SVG

动笔前先读 [references/optimization-and-verification.md](references/optimization-and-verification.md) 的"优化"部分（三色调明暗、线宽分级、构图、动画幅度、文件大小）。

在工作区写 `draw.py`，导入 [scripts/svgkit.py](scripts/svgkit.py)（`sys.path.insert(0, '.agents/skills/svg-kit-assets/scripts')`，仓库根目录下执行），每个图标一个函数，统一出图。好处是调色板、线宽、动画 CSS 全套一致，改一处就能全部重出。

画法规则（每条都对应一个真实踩过的坑）：

| 规则 | 原因 |
| --- | --- |
| 外轮廓 `stroke="currentColor"`，填色用固定色，不用 `fill="currentColor"` | 取色器只该改线条；大面积跟随会在深色背景下整块变白 |
| 眼睛、深色小部件用固定深色（`#3A2C22`）加白色高光 | 用 currentColor 的话，眼睛在深色页面会变成浅色 |
| 不画整幅底板，避开 `scripts/lib/svg-kit-tiles.ts` 的 `TILE_FILLS` / `TILE_STROKES` 颜色 | `check:svg-kits` 会把它们当成不透明底板 |
| 质感用 `Icon.shape(..., shade=...)`：填色、裁剪在形状内的暗部和纹理、轮廓叠在最上 | "更高质量"的主要来源：明暗、高光（左上光源）、草编/木纹/砖瓦等纹理 |
| 每个图标只有一个动画元素，class 为 `<theme>-<icon>-motion`，类型与 manifest 一致 | 浏览器验收要求动画数为 1，暂停和减少动态才可靠 |
| 只让该动的部件动（烟、木桶、风帆、车身），地面和阴影静止 | 整图一起晃显得廉价，也更容易越出边界 |
| 旋转件以枢轴为中心对称，`transform-box:view-box` 配像素级 origin | 用 fill-box 的中心不一定是轴心，会甩出画布 |
| 所有 id、class、`@keyframes` 都带前缀 `<theme>-<icon>-`，CSS 选择器也只能用它们 | 详情弹层把 SVG 直接内联进页面，裸选择器和重名 id 会污染整页 |
| 根元素 id 为 `<theme>-<icon>-root`，加 `#root,#root g{animation-play-state:inherit}` | `animation-play-state` 不会继承，没有这条链，宿主暂停不了 |
| 不用 `<text>`、`<image>`、外链、字体、脚本 | 字体因机器而异，外链会被拦截 |
| 任何动画相位都留 ≥3 个 viewBox 单位的透明边 | 卡片会裁切；验收按 8 个相位测量 |

## 第 5 步：看图迭代

```bash
S=.agents/skills/svg-kit-assets/scripts
node $S/sheet.mjs <themeDir> /tmp/fx-lab-<id>-work/all.png 130            # 总览，浅色和深色各一行
node $S/sheet.mjs <themeDir> /tmp/fx-lab-<id>-work/q1.png 280 a,b,c,d     # 每批 4 个看细节
node $S/sheet.mjs <themeDir> /tmp/fx-lab-<id>-work/small.png 48           # 小尺寸剪影辨认
INK=#e5484d node $S/sheet.mjs <themeDir> /tmp/fx-lab-<id>-work/ink.png 130  # 红色即跟随取色器
node $S/filmstrip.mjs <themeDir> /tmp/fx-lab-<id>-work/film.png 120        # 8 相位动画帧条与安全边
```

用 Read 工具打开 PNG，逐个看 280px 的细节图，并修掉下面这类问题：

- 前后层错了（门柱压在横栏后面、车轮盖住挡泥板）。
- 形状在边缘被平切（草堆一侧像悬崖）。
- 装饰件被看成别的东西（地平线上的光芒像小旗）。
- 小部件悬空、没贴在宿主上（瓢虫不在叶子上）。
- 地面只有一条细缝，或在深色背景下轮廓消失。

至少完整看过一轮再进入验收，不要只看总览缩略图。

## 第 6 步：验收（全部通过才能发布）

按 [references/optimization-and-verification.md](references/optimization-and-verification.md) 的"验证"部分逐层进行，前一层不过不进下一层。重绘时加做新旧对比：原稿目录和新目录用同一个 cell 各出一张总览图，并排看。

```bash
npx tsx $S/validate-static.mts <themeDir> [--original /tmp/fx-lab-<id>-work/original]
node $S/validate-browser.mjs <themeDir> /tmp/fx-lab-<id>-work/validate
npm run check:svg-kits && npm run build        # 种子主题必跑
```

- 静态校验：manifest 合法、文件与清单一一对应、预算、XML 合法、禁用标签、引用都在本地、前缀、作用域、currentColor、底板、以及重绘规则。
- 浏览器校验：动画数、宿主暂停和恢复、减少动态、8 个相位的边距、80 与 320 两种尺寸的浅色和深色渲染、控制台错误为 0、外部请求为 0。
- 边距失败时，报告会给出相位和四边数值（左、上、右、下）。缩小那个部件或降低动画幅度即可，不要放宽阈值。

## 第 7 步：发布与线上核对

**种子主题**
1. 只 `git add seed/svg-kits/<id>`。仓库里其他未跟踪的 `artifacts/` 不是本次产出，不要带上。
2. 提交、推送 `main`。
3. 轮询 `https://fx-lab-5do.pages.dev/seed-svg-kits/<id>/manifest.json?t=$RANDOM`，直到件数变成新值，通常 1 到 2 分钟。

**R2 主题或新主题**
1. 用管理口令写入（同时更新 R2 的 `index.json`）：

   ```bash
   node -e "const fs=require('fs'),d=process.argv[1],t=JSON.parse(fs.readFileSync(d+'/manifest.json'));const files={};for(const i of t.icons)files[i.id]=fs.readFileSync(d+'/icons/'+i.id+'.svg','utf8');fs.writeFileSync('/tmp/fx-lab-payload.json',JSON.stringify({theme:t,files}))" <themeDir>
   curl -sf -X PUT https://fx-lab-5do.pages.dev/api/svg-kits/<id> -H "Authorization: Bearer $SVG_KITS_ADMIN_TOKEN" -H 'content-type: application/json' --data-binary @/tmp/fx-lab-payload.json
   ```

   没有口令就停下来问用户，不要猜，也不要绕过 API 直接拼 R2 键。
2. 清 CDN 缓存，做法见 仓库里的 `docs/deploy.md`：每个 URL 都要清"不带 Origin"和"带站点 Origin"两份，`index.json` 也要清。清缓存前先征得用户同意。

**两种都要做的线上核对**

用 Playwright 打开 `https://fx-lab-5do.pages.dev/svg-kits/<id>?bg=checker&stroke=1c1d24`，滚动到底，统计 `.kit-svg` 里已渲染的 shadow SVG 数量是否等于件数；再打开 `&icon=<某个新 id>` 截图，确认详情弹层正常。

本地预览要后台启动：`npx vite preview --port 4799 --strictPort --host 127.0.0.1`，Shell 的 `block_until_ms` 设为 0。前台启动的服务会在命令结束时退出，Chrome 随即报连接被拒。

## 第 8 步：收尾与汇报

- 停掉预览服务，删除 `/tmp/fx-lab-<id>-work/` 和 `/tmp/fx-lab-payload.json`。`/tmp/fx-lab-pw` 可以留着复用。
- 汇报只写实际测到的数字：件数（新增多少）、最大字节和元素数、最小边距、Chrome 版本、错误数和外部请求数、提交号或发布结果、线上件数。
- 有一步失败，就如实写哪一步失败、卡在哪，不要声称已上线。

## 常见坑

| 坑 | 处理 |
| --- | --- |
| 改了种子，线上没变 | R2 里有同名主题；改走 R2 那一行 |
| 校验报 `unscoped CSS selector` | 选择器必须以 `#<theme>-<icon>-` 或 `.<theme>-<icon>-` 开头 |
| 暂停测试失败 | 缺根元素 id 或 `#root g{animation-play-state:inherit}` |
| 一个图标有 2 个以上动画 | 把附带的动作并进同一个 motion 组，或干脆去掉 |
| 历史主题（如 basics）跑静态校验报错 | 它们早于这套规范；只有在重绘它们时才需要修 |
| `check:svg-kits` 报 `ink #xxxxxx should be currentColor` | 该主题在 `INK_COLORS` 里登记了主墨色，换成 currentColor 或换个颜色 |
