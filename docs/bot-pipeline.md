# SVG Kits 素材自动化流水线（Grok bot 组织方案）

给主 bot（编排者）看的完整说明。目标：持续增加主题，持续提高现有主题的质量和数量。Google Sheet 当任务数据库，bot 之间只通过 Sheet 交接，不直接对话。

素材的具体做法以仓库里的 skill 为准：`.agents/skills/svg-kit-assets/SKILL.md`（以下简称 skill）。本文只规定分工、交接和规则，不重复画法。

---

## 1. 总体结构

```
 选题 bot（持续运行）            制作 bot ×10                 审核发布 bot ×1
 Scout-New ×2  ─┐              Producer-01..10              Publisher
 Scout-Audit ×1 ─┼─写入→ [tasks: proposed]                       
                 │      编排者审核 → ready
                 │                 ↓ 认领
                 │          claimed → in_progress → in_review ──→ 复验 → PUT 发布 → published
                 │                     ↑                │
                 │                     └─ changes_requested ┘
 编排者 Orchestrator ×1：建 bot、审批选题、回收超时任务、刷新主题表、每日汇报、上报人类
```

共 15 个 bot：

| 角色 | 数量 | 职责一句话 | 持有的权限 |
| --- | --- | --- | --- |
| Orchestrator（主 bot） | 1 | 审批选题、调度、回收、汇报 | Sheet 读写 |
| Scout-New | 2 | 找值得做的新主题，写出制作规格 | Sheet 写 `tasks`（只能新增 proposed 行） |
| Scout-Audit | 1 | 审计现有主题，提出补充和重绘任务 | Sheet 写 `tasks`，读线上 API |
| Producer | 10 | 按 skill 制作、自测，打包上传 | 仓库只读 clone、Drive 上传、Sheet 改自己认领的行 |
| Publisher | 1 | 独立复验、发布到线上、线上核对 | **唯一持有 `SVG_KITS_ADMIN_TOKEN`** |

为什么发布只给 1 个 bot：

1. 发布接口 `PUT /api/svg-kits/<id>` 整体覆盖该主题的 manifest。两个 bot 同时改同一主题，后发布的会冲掉前一个的成果。
2. 新主题发布时会对 `index.json` 先读后写（`functions/api/svg-kits/[[path]].ts:66-71`），没有锁。两个新主题同时发布，可能有一个从主题列表里消失。
3. 口令只放在一处，制作 bot 出错也写不坏线上数据。

发布本身只要几分钟，1 个 Publisher 足够支撑 10 个 Producer。审核积压时再加一个只审核、不发布的 Reviewer。

---

## 2. Google Sheet 结构

一个 Spreadsheet，三个工作表。所有时间用 UTC ISO 格式（`2026-10-12T08:30:00Z`）。

### 2.1 `tasks`（主表，每行一个任务）

| 列 | 写入者 | 说明 |
| --- | --- | --- |
| `task_id` | Scout | `T-YYYYMMDD-NNN`，全表唯一 |
| `type` | Scout | `new_theme` / `enrich`（补数量）/ `redraw`（重绘提质）/ `fix`（修校验或显示问题） |
| `theme_id` | Scout | kebab-case。新主题先查 `themes` 表和线上 `index.json` 防重名 |
| `title_zh` / `title_en` | Scout | 主题名 |
| `kind` | Scout | `icon` 或 `illustration`，决定预算（见 docs/svg-kits.md） |
| `brief` | Scout | 制作规格，格式见第 4 节 |
| `rationale` | Scout | 为什么值得做，附证据链接 |
| `score` | Scout | 0–100，评分规则见第 4 节 |
| `priority` | Orchestrator | P0 / P1 / P2 |
| `status` | 各角色按状态机改 | 见 2.4 |
| `owner` | 认领者 | bot 名，如 `Producer-03` |
| `claimed_at` / `heartbeat_at` | 认领者 | 认领时间、最近一次心跳 |
| `base_hash` | Producer | 开工时线上 manifest 的 sha256（新主题填 `none`），发布前用来检测别人是否改过 |
| `package_url` | Producer | 产物包链接（Drive 文件夹） |
| `review_notes` | Publisher | 退回原因，逐条列出 |
| `review_round` | Publisher | 退回次数，上限 2 |
| `live_url` | Publisher | `https://fx-lab.ticoag.fun/svg-kits/<theme_id>` |
| `result` | Publisher | 实测数字：件数（新增多少）、最大字节 / 元素数、最小边距、线上件数 |
| `depends_on` | Scout / Orchestrator | 前置任务 id，前置未 `published` 不可认领 |
| `updated_at` | 每次写入者 | |

### 2.2 `themes`（主题总览，Orchestrator 每 6 小时刷新）

| 列 | 来源 |
| --- | --- |
| `theme_id` / `title_zh` / `kind` | `GET https://fx-lab.ticoag.fun/api/svg-kits/<id>` |
| `icon_count` / `categories`（分类及各自件数） | 同上 |
| `views` | `GET https://fx-lab.ticoag.fun/api/svg-kits/stats/views` |
| `store` | `seed` 或 `r2` |
| `quality` | Scout-Audit 打的 A/B/C/D |
| `active_task` | 该主题当前未完成的 task_id，空表示可开新任务 |
| `last_published_at` | 最近一次发布时间 |

### 2.3 `log`（只追加）

`time, bot, task_id, event, detail`。每次状态变化、失败、上报都追加一行。排查问题只看这张表。

### 2.4 状态机

```
proposed ──Orchestrator──→ ready ──Producer 认领──→ claimed → in_progress → in_review
   │                                                                     │
   └→ rejected                                  changes_requested ←──────┤ (Publisher 退回)
                                                      │                  │
                                                      └→ in_progress     ├→ published（发布并线上核对通过）
                                                                         └→ failed（退回超过 2 次 / 无法发布）
任意进行中状态 ──→ blocked（等人类决定，写明原因）
```

每个状态只有一个角色能改到下一个状态。不是自己负责的转换，不要动。

---

## 3. 共同规则（所有 bot 都遵守）

1. **一个主题同一时间只能有一个进行中的任务**（`claimed` / `in_progress` / `in_review` / `changes_requested`）。认领前检查 `themes.active_task`。
2. **认领防撞**：Sheet 没有事务。认领时写 `owner`、`claimed_at`、`status=claimed`，等 10 秒后重新读这一行：`owner` 仍是自己才开工，否则放弃换下一个。
3. **心跳**：进行中每 30 分钟更新一次 `heartbeat_at`。超过 2 小时没心跳，Orchestrator 把任务退回 `ready` 并清空 `owner`。
4. **种子主题不碰**：`seed/svg-kits/index.json` 里的 pastoral、line-basics 等主题需要 git push，多 bot 并发会冲突。只处理 R2 主题（线上 `index.json` 里有、且不是只存在于种子的）。basics、cthulhu-mythos 线上已在 R2，按 R2 主题处理。
5. **不写仓库**：Producer 用自己的仓库 clone，只读代码和脚本，不提交、不推送。
6. **临时文件按任务隔离**：工作目录用 `/tmp/fx-lab-<theme_id>-<task_id>-work/`；skill 第 7 步的 payload 文件改成 `/tmp/fx-lab-payload-<task_id>.json`，避免同机多个 bot 互相覆盖。
7. **版权**：不画受版权保护的具体角色、logo、商标、可识别的作品场景。做风格和题材（"日系热血漫风格的道具"可以，"某作品主角"不行）。拿不准的选题标 `blocked` 交人类。
8. **只报实测**：结果栏只写命令真实输出的数字。某一步失败就写失败在哪，不写"已完成"。
9. **每次状态变化都写 `log`**。

---

## 4. 选题 bot

### 4.1 Scout-New ×2（找新主题）

两个 bot 分方向，避免重复：

- **Scout-New-A：实用方向**。产品界面常用但现有主题没覆盖的题材，例如电商、金融、医疗、教育、办公协作、天气、交通、节日（提前 4–8 周做下一个节日）。
- **Scout-New-B：风格与文化方向**。游戏、动漫类型风格、地域文化、历史时期、自然科学。

调研来源：图标市场的热门搜索和合集、设计社区的热门作品、节日日历、现有主题的浏览排名（`themes.views` 高的题材说明受欢迎，可以做相邻题材）。

**值得做的判断标准（打分 0–100）**

| 维度 | 分值 | 看什么 |
| --- | --- | --- |
| 用途 | 30 | 能直接放进网页或 App 用的场景有多少 |
| 物件丰富度 | 20 | 能否列出 ≥24 个互不重复、剪影可区分的物件 |
| 适合动画 | 15 | 多数物件有自然的单一动作（飘、摇、转、闪、弹） |
| 与现有主题差异 | 20 | 和 `themes` 表里已有主题重叠越少分越高 |
| 风险 | 15 | 无版权问题、无敏感内容得满分 |

低于 60 分不写入。每轮最多写 5 条。`ready` + `proposed` 合计超过 30 条时，只调研不写入，等队列消化。

### 4.2 Scout-Audit ×1（审计现有主题）

每轮挑 3–5 个主题，按浏览量从高到低轮转：

1. 拉 manifest 和全部 SVG 到 `/tmp`，用 skill 的 `sheet.mjs` 出 130px 总览和 48px 小尺寸图，用 `validate-static.mts` 跑静态校验。
2. 给 `quality` 打分：A 无需处理；B 数量少或分类不均 → 提 `enrich`；C 画质低（无明暗、线宽乱、小尺寸认不出）→ 提 `redraw`；D 校验失败或显示异常 → 提 `fix`。
3. 浏览量高、件数少的主题优先补数量；浏览量高、质量 C/D 的主题优先重绘。

### 4.3 `brief` 格式（Scout 必须填全，Producer 只按这个做）

```
风格：<一句话，含参考的画法，如"低饱和暖色，三色调明暗，左上光源">
调色板：<5–8 个主色的 hex>
分类：<分类名 × 件数>，例如 道具×8、建筑×8、生物×8
图标清单：<id | 中文名 | 动画类型 | 一句话画面描述>，逐个列出
目标件数：<新主题 24–36；enrich 时写"现有 N → 目标 M"，新增 ≤24>
不要：<要避开的元素，如具体角色、文字>
参考：<链接，只作风格参考，不临摹>
```

一个任务的新增或重绘不超过 24 个图标。更大的工作量拆成多个任务，用 `depends_on` 串起来（同一主题本来也只能串行）。

---

## 5. Producer ×10（制作）

循环：

1. 从 `tasks` 取 `status=ready`、`depends_on` 已完成、主题无进行中任务的行，按 `priority` → `score` → `created_at` 排序，取第一个，按第 3 节规则认领。
2. 改 `status=in_progress`。拉线上 manifest，算 sha256 写进 `base_hash`（新主题写 `none`）。
3. 按 skill 第 2–6 步执行：原稿下载、先写 manifest、用 `svgkit.py` 生成、看图迭代、静态校验 + 浏览器校验全部通过。`enrich` / `redraw` 必须遵守 skill 第 3 步"已有图标 id、顺序、分类、动画不能改"。
4. **不发布**（skill 第 7 步由 Publisher 做）。打包上传到 Drive：`fx-lab-pipeline/<task_id>/`，包含：
   - `theme/`：`manifest.json` + `icons/*.svg`（完整主题，不是增量）
   - `all.png`、`film.png`、`small.png`，重绘任务另加新旧对比图
   - `validate-static.txt`、`validate-browser.json`（原始输出）
   - `base_hash.txt`
5. 填 `package_url`，改 `status=in_review`，写 `log`，进入下一轮。
6. 被退回（`changes_requested`）时优先处理自己的退回任务，再认领新任务。

卡住超过 1 小时（同一个校验反复失败）就改 `blocked`，在 `log` 写清卡在哪，不要放宽阈值。

---

## 6. Publisher ×1（复验、发布、线上核对）

按 `in_review` 的 `updated_at` 先后处理，一次只处理一个。

1. **复验，不信任包里的报告**：下载 `theme/`，自己重跑 `validate-static.mts`（重绘任务加 `--original`）和 `validate-browser.mjs`。
2. **看图**：280px 逐批看，对照 `brief` 检查件数、分类、画面描述、是否有前后层错误、悬空、深色背景下轮廓消失（skill 第 5 步的清单）。检查版权风险、和其他主题是否重复。
3. 不通过：在 `review_notes` 逐条写问题（哪个图标、什么问题），`review_round+1`，改 `changes_requested`。第 3 次不通过改 `failed`。
4. **发布前版本检查**：重新拉线上 manifest 算 sha256，和 `base_hash` 比。不一致说明有人改过，退回 Producer 基于新版本重做。
5. 发布：按 skill 第 7 步 `PUT /api/svg-kits/<theme_id>`。
6. CDN：见第 8 节"需要你决定的事"第 1 条。
7. 线上核对：skill 第 7 步的 Playwright 检查，渲染数 = 件数，打开一个新图标的详情弹层截图。
8. 填 `live_url`、`result`，改 `published`，更新 `themes` 表对应行的 `active_task` 为空、`last_published_at`。

---

## 7. Orchestrator（主 bot）

### 7.1 启动

1. 建 Sheet 和三个工作表，表头按第 2 节。
2. 按第 1 节创建 14 个 bot，每个 bot 的系统提示 = 第 3 节共同规则 + 本角色那一节全文 + skill 路径。
3. 先用 `themes` 刷新逻辑填好主题总览。
4. **试运行**：先只开 Scout-New-A、Scout-Audit、2 个 Producer、Publisher，跑通 3 个任务（1 个 new_theme、1 个 enrich、1 个 redraw）都到 `published`，再开满。

### 7.2 每 15 分钟一轮

1. 审 `proposed`：重名或与已有主题重叠 → `rejected` 并写原因；分数 ≥75 设 P0/P1，60–75 设 P2；改 `ready`。保持 `ready` 里新主题和提质任务大致各半，不要只做新主题。
2. 回收超时：`heartbeat_at` 超过 2 小时 → 退回 `ready`，清 `owner`，写 `log`。
3. 维护 `themes.active_task`，发现同一主题有两个进行中任务时，把较晚认领的退回 `ready`。
4. 失败率监控：同一个 Producer 连续 2 个 `failed`，暂停它并检查它的提示词。

### 7.3 每天一次汇报给人类

当天发布数（新主题 / 补充 / 重绘）、新增图标总数、审核通过率、`blocked` 列表及原因、队列长度、浏览量前 10 的主题变化。

### 7.4 必须上报人类、不能自己决定的事

- 缺口令、口令失效、发布接口返回非 2xx。
- 任何删除主题、改主题 id、改已有图标 id 的需求。
- 版权拿不准的选题。
- 需要改仓库代码（网站 UI、函数、skill 本身）的问题。

---

## 8. 需要你决定的事（开工前）

1. **CDN 清缓存授权**。skill 要求清缓存前征得同意。`index.json` 和 manifest 在 CDN 缓存 1 天，不清的话新主题和更新最多晚 1 天在线上显示。二选一：
   - 授权 Publisher 每次发布后按 `docs/deploy.md` 自动清缓存（需要给它 Cloudflare API token）；
   - 不清缓存，接受最多 1 天延迟，Publisher 的线上核对改为加 `?t=随机数` 直接请求 API 验证。
2. **口令**：`SVG_KITS_ADMIN_TOKEN` 只交给 Publisher。
3. **产物包存放**：本文默认 Google Drive 文件夹；也可以用任何三个角色都能读写的存储。

---

## 9. 已知限制

- Sheet 认领靠"写入后复读"防撞，极低概率仍会两个 bot 同时认领；第 3 节规则 1 和 Orchestrator 的重复检查会兜底，最多浪费一次制作。任务量大到经常撞车时，改为 Orchestrator 直接分配（写 `owner`），Producer 只做分配给自己的任务。
- 发布串行，Publisher 是吞吐上限。审核积压超过 10 条时，加一个只做第 6 节 1–3 步的 Reviewer，发布仍只由 Publisher 执行。
- `index.json` 的并发写问题靠单一发布者规避，代码本身没有修。
