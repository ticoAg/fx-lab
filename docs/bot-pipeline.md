# SVG Kits 素材自动化流水线（Grok bot 组织方案）

给主 bot（编排者）看的完整说明。目标：持续增加主题，持续提高现有主题的质量和数量。Google Sheet 当任务数据库，保存全部状态；Orchestrator 用消息给其他 bot 派活，其他 bot 做完一件事就向 Orchestrator 汇报。bot 没有定时器，流水线靠"汇报 → 派下一件"持续运转，见第 3 节。

素材的具体做法以仓库里的 skill 为准：`.agents/skills/svg-kit-assets/SKILL.md`（以下简称 skill）。本文只规定分工、交接和规则，不重复画法。

---

## 1. 总体结构

```
 选题 bot（持续运行）            制作 bot ×10                 审核发布 bot ×1
 Scout-New ×2  ─┐              Producer-01..10              Publisher
 Scout-Audit ×1 ─┼─写入→ [tasks: proposed]                       
                 │      编排者审核 → ready
                 │                 ↓ 编排者派给某个 Producer
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
| Producer | 10 | 按 skill 制作、自测，打包上传 | 仓库只读 clone、Drive 上传、Sheet 改派给自己的行 |
| Publisher | 1 | 独立复验、发布到线上、线上核对 | **唯一持有 `SVG_KITS_ADMIN_TOKEN`** |

为什么发布只给 1 个 bot：

1. 发布接口 `PUT /api/svg-kits/<id>` 整体覆盖该主题的 manifest。两个 bot 同时改同一主题，后发布的会冲掉前一个的成果。
2. 新主题发布时会对 `index.json` 先读后写（`functions/api/svg-kits/[[path]].ts:66-71`），没有锁。两个新主题同时发布，可能有一个从主题列表里消失。
3. 口令只放在一处，制作 bot 出错也写不坏线上数据。

发布本身只要几分钟，1 个 Publisher 足够支撑 10 个 Producer。审核积压时再加一个只审核、不发布的 Reviewer。

---

## 2. Google Sheet 结构

一个 Spreadsheet，四个工作表。所有时间用 UTC ISO 格式（`2026-10-12T08:30:00Z`）。

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
| `owner` | Orchestrator | 派给谁，bot 名，如 `Producer-03` |
| `claimed_at` | Orchestrator | 派活时间 |
| `heartbeat_at` | owner | 最近一次阶段进展的时间，见第 3 节 |
| `base_hash` | Producer | 开工时线上 manifest 的 sha256（新主题填 `none`），发布前用来检测别人是否改过 |
| `package_url` | Producer | 产物包链接（Drive 文件夹） |
| `review_notes` | Publisher | 退回原因，逐条列出 |
| `review_round` | Publisher | 退回次数，上限 2 |
| `live_url` | Publisher | `https://fx-lab.ticoag.fun/svg-kits/<theme_id>` |
| `result` | Publisher | 实测数字：件数（新增多少）、最大字节 / 元素数、最小边距、线上件数 |
| `depends_on` | Scout / Orchestrator | 前置任务 id，前置未 `published` 不可派发 |
| `updated_at` | 每次写入者 | |

### 2.2 `themes`（主题总览，Orchestrator 每发布 5 个任务或每天至少刷新一次）

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

### 2.4 `notes`（经验记录，只追加）

`time, role, note`。常见退回原因、踩过的坑、调研中发现已经做烂的方向。bot 换班时，新 bot 先读本角色的 notes（见第 3 节"上下文换班"）。

### 2.5 状态机

```
proposed ──Orchestrator──→ ready ──Orchestrator 派发──→ claimed → in_progress → in_review
   │                                                                     │
   └→ rejected                                  changes_requested ←──────┤ (Publisher 退回)
                                                      │                  │
                                                      └→ in_progress     ├→ published（发布并线上核对通过）
                                                                         └→ failed（退回超过 2 次 / 无法发布）
任意进行中状态 ──→ blocked（等人类决定，写明原因）
```

每个状态只有一个角色能改到下一个状态。不是自己负责的转换，不要动。

---

## 3. 运行方式与共同规则

### 3.1 运行方式：消息驱动，没有定时器

bot 不能给自己设定时任务，但可以给其他 bot 发消息安排工作，会话上下文会一直保留。所以流水线靠"做完就汇报，收到汇报就派下一件"转起来：

```
Orchestrator ──派活──→ Producer-03：做 T-20261012-007
Producer-03  ──汇报──→ Orchestrator：DONE T-20261012-007 in_review
Orchestrator ──派活──→ Publisher：审 T-20261012-007
             ──派活──→ Producer-03：做 T-20261012-012
```

1. **只由 Orchestrator 派活**。其他 bot 不自己从 Sheet 挑任务，只做派给自己的那一件。Orchestrator 派活时先在 Sheet 写好 `owner`、`claimed_at`、`status=claimed`，再发消息。只有一个人派活，就不会出现两个 bot 抢同一个任务。
2. **每个工作单元结束必须汇报**。成功、失败、卡住都要发，格式固定：
   `[DONE|FAIL|BLOCKED] <bot> <task_id> <新状态> <一句话>`
   bot 做完不汇报，流水线就在它这里断了。汇报之后就停下，等下一条派活消息。
3. **Orchestrator 把每条汇报当作一次唤醒**：先核对 Sheet，再做第 7.2 节的检查，最后给所有空闲 bot 派活。
4. **不能让所有 bot 同时空闲**。只要有一个 bot 在干活，它的汇报就会再次唤醒 Orchestrator。所以 Orchestrator 始终让至少 1 个 Scout 在工作：队列已满时，派 Scout 去做审计、补全或细化已有 brief，而不是停下。
5. **长任务分阶段记进度**。Producer 一个任务常常超过 1 小时。每完成一个阶段（manifest 定稿、出图完成、校验通过、打包上传）就更新 `heartbeat_at` 并写 `log`，但只在整个任务结束时才给 Orchestrator 发汇报。
6. **失联处理**。Orchestrator 每次被唤醒都检查进行中任务：`heartbeat_at` 超过 2 小时没变，先给这个 bot 发一条询问；下次被唤醒时仍没有回音，就把任务退回 `ready`、清空 `owner`，改派给别人，并新建一个 bot 替换失联的那个。
7. **全线停止只能由人类重启**。如果 Orchestrator 自己出错，没有任何东西能唤醒它。你每天应该收到一次汇报（第 7.3 节），某天没收到，就是断了：给 Orchestrator 发一条"读 Sheet，恢复流水线"。所有状态都在 Sheet 里，它能从 Sheet 恢复。
8. **上下文换班**。会话上下文一直累积，会越来越长、越来越慢，最终被截断。Producer 每完成 10 个任务、Scout 每做完 20 轮、Publisher 每发布 20 个任务，就把值得留下的经验写进 `notes` 表，然后向 Orchestrator 汇报 `ROTATE`。Orchestrator 新建一个同角色的 bot 接替：新 bot 的初始消息 = 本节和第 3.2 节的共同规则 + 本角色章节全文 + skill 路径 + "先读 notes 表里本角色的记录"。Orchestrator 自己的上下文过长时，在每日汇报里告诉人类，由人类开一个新的 Orchestrator，让它从 Sheet 和 notes 接手。

### 3.2 共同规则（所有 bot 都遵守）

1. **一个主题同一时间只能有一个进行中的任务**（`claimed` / `in_progress` / `in_review` / `changes_requested`）。Orchestrator 派活前检查 `themes.active_task`。
2. **种子主题不碰**：`seed/svg-kits/index.json` 里的 pastoral、line-basics 等主题需要 git push，多 bot 并发会冲突。只处理 R2 主题（线上 `index.json` 里有、且不是只存在于种子的）。basics、cthulhu-mythos 线上已在 R2，按 R2 主题处理。
3. **不写仓库**：Producer 用自己的仓库 clone，只读代码和脚本，不提交、不推送。
4. **临时文件按任务隔离**：工作目录用 `/tmp/fx-lab-<theme_id>-<task_id>-work/`；skill 第 7 步的 payload 文件改成 `/tmp/fx-lab-payload-<task_id>.json`，避免同机多个 bot 互相覆盖。
5. **版权**：不画受版权保护的具体角色、logo、商标、可识别的作品场景。做风格和题材（"日系热血漫风格的道具"可以，"某作品主角"不行）。拿不准的选题标 `blocked` 交人类。
6. **只报实测**：结果栏只写命令真实输出的数字。某一步失败就写失败在哪，不写"已完成"。
7. **每次状态变化都写 `log`**。

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

每收到一次派活做一轮调研，做完汇报。低于 60 分不写入。每轮最多写 5 条。`ready` + `proposed` 合计超过 30 条时，Orchestrator 会改派细化任务（补全已有 brief 的图标清单、核对重名），不要硬凑新选题。

### 4.2 Scout-Audit ×1（审计现有主题）

每收到一次派活，挑 3–5 个主题，按浏览量从高到低轮转（上次审到哪里记在 `notes` 表），做完汇报：

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

每次只做 Orchestrator 派给自己的一个任务：

1. 读派活消息里的 `task_id`，在 Sheet 确认这一行 `owner` 是自己。不是就汇报 `FAIL` 并停下。
2. 改 `status=in_progress`。拉线上 manifest，算 sha256 写进 `base_hash`（新主题写 `none`）。
3. 按 skill 第 2–6 步执行：原稿下载、先写 manifest、用 `svgkit.py` 生成、看图迭代、静态校验 + 浏览器校验全部通过。`enrich` / `redraw` 必须遵守 skill 第 3 步"已有图标 id、顺序、分类、动画不能改"。
4. **不发布**（skill 第 7 步由 Publisher 做）。打包上传到 Drive：`fx-lab-pipeline/<task_id>/`，包含：
   - `theme/`：`manifest.json` + `icons/*.svg`（完整主题，不是增量）
   - `all.png`、`film.png`、`small.png`，重绘任务另加新旧对比图
   - `validate-static.txt`、`validate-browser.json`（原始输出）
   - `base_hash.txt`
5. 填 `package_url`，改 `status=in_review`，写 `log`，向 Orchestrator 汇报 `DONE`，然后停下等下一条派活。
6. 被退回（`changes_requested`）的任务，Orchestrator 会派回给原 Producer，因为它的上下文里有这个主题的全部制作过程。

每个阶段结束更新 `heartbeat_at`（第 3.1 节第 5 条）。卡住超过 1 小时（同一个校验反复失败）就改 `blocked`，在 `log` 写清卡在哪，汇报 `BLOCKED`，不要放宽阈值。

---

## 6. Publisher ×1（复验、发布、线上核对）

Orchestrator 按 `in_review` 的 `updated_at` 先后派过来，一次只处理一个，处理完汇报（通过发布汇报 `DONE ... published`，退回汇报 `DONE ... changes_requested`）。

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

1. 建 Sheet 和四个工作表（`tasks`、`themes`、`log`、`notes`），表头按第 2 节。
2. 按第 1 节创建 14 个 bot，每个 bot 的初始消息 = 第 3 节全文 + 本角色那一节全文 + skill 路径 + "做完一件事就按格式向 Orchestrator 汇报，然后停下等派活"。
3. 先刷新 `themes` 表。
4. 给两个 Scout 各派一轮调研，流水线从它们的汇报开始转动。
5. **试运行**：先只开 Scout-New-A、Scout-Audit、2 个 Producer、Publisher，跑通 3 个任务（1 个 new_theme、1 个 enrich、1 个 redraw）都到 `published`，再开满。

### 7.2 每次收到汇报时做的事

1. 按汇报更新 Sheet 和 `log`，核对汇报内容和 Sheet 一致。
2. 审 `proposed`：重名或与已有主题重叠 → `rejected` 并写原因；分数 ≥75 设 P0/P1，60–75 设 P2；改 `ready`。保持 `ready` 里新主题和提质任务大致各半，不要只做新主题。
3. 失联检查：按第 3.1 节第 6 条处理 `heartbeat_at` 超过 2 小时的任务。
4. 维护 `themes.active_task`，发现同一主题有两个进行中任务时，把较晚派出的退回 `ready`。
5. 派活，按这个顺序给空闲 bot 派：
   - Publisher：最早进入 `in_review` 的任务；
   - Producer：先派回自己的 `changes_requested` 任务，再从 `ready` 中按 `priority` → `score` → `created_at` 取 `depends_on` 已完成、主题无进行中任务的一条；
   - Scout：始终保持至少 1 个在工作（第 3.1 节第 4 条）。
6. 收到 `ROTATE`：按第 3.1 节第 8 条换班。
7. 失败率监控：同一个 Producer 连续 2 个 `failed`，暂停给它派活，检查它的初始消息和 `notes`。

### 7.3 每天一次汇报给人类

没有定时器，以"距上次汇报超过 24 小时后收到的第一条汇报"为触发点。

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

- 流水线靠汇报驱动。Orchestrator 自己出错或所有 bot 同时停下，就不会再有人唤醒它，只能由人类重启（第 3.1 节第 7 条）。
- 所有派活都经过 Orchestrator，它的上下文增长最快，需要人类定期帮它换班。
- 发布串行，Publisher 是吞吐上限。审核积压超过 10 条时，加一个只做第 6 节 1–3 步的 Reviewer，发布仍只由 Publisher 执行。
- `index.json` 的并发写问题靠单一发布者规避，代码本身没有修。
