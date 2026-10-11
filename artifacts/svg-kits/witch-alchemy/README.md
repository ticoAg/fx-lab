# 西方女巫与炼金 · Witch & Alchemy

这套 24 幅透明 SVG 插画把主题收束为一间植物炼金柜：铸铁与铜、黄铜、烟色玻璃、羊皮纸、皮革、紫晶和翡翠构成固定材质，`currentColor` 负责外轮廓和少量刻线。每个主体都重新安排了轮廓、遮挡、接触阴影和高光：器皿有独立的液面与承重结构，动物有可辨认的喙、足、肢体和羽毛层次，植物遵循茎叶花果的连接关系，符号采用开放的镂空金属结构。背景保持透明，不写卡片或景物底板。

24 个原始 ID、标题、顺序、类别、动画字段、`cover`、`kind: illustration`、`viewBox: 0 0 80 80` 和 `sheet: elements.svg` 均保留。描述已更新为最终绘图内容，并明确区分固定材质色和可换的 `currentColor` 轮廓。动画仍保持原主题意图：蒸汽、火焰、气泡、轻摆、慢转和短促弹动；所有动画继承宿主的 `animation-play-state`，并在 `prefers-reduced-motion: reduce` 时关闭。

已执行的检查：

- `python3 /tmp/fx-lab-witch-refinement/validate.py`：24/24 文件改变，元数据、viewBox、顺序和原始备份校验通过；最大文件 18,035 bytes，最大 161 个 XML 元素，总计 214,826 bytes；ID、类名、引用、外部资源和不安全事件属性检查通过。
- `node /tmp/fx-lab-witch-refinement/browser-check-full.mjs`：Chrome 155.0.8059.39 渲染全部 24 幅的浅色/深色 80px 和 320px 状态，共 96 组；24/24 宿主暂停、恢复和减少动态效果通过，浏览器错误和外部请求均为 0。
- `python3 /tmp/fx-lab-witch-refinement/check-margins.py`：120 个动画相位截图通过，最小透明边距为 3.25 个 viewBox 单位。
- `node --import tsx /tmp/fx-lab-prepare-release.mts artifacts/svg-kits/witch-alchemy /tmp/fx-lab-witch-refinement/original .data/svg-kits-releases`：24 个 SVG 的 schema、XML、引用、预算、身份字段及总览检查通过。
- `preview-light.png`、`preview-dark.png`：24 幅同尺寸联系表；`comparison.png`：8 幅原稿/重绘对照。

2026-10-11 已发布到 R2 桶 `fx-lab-svg-kits` 的 `themes/witch-alchemy/`：24 个图标、manifest 与总览，共 26 个对象。`elements.svg` 已生成，验证了画廊 CSS 下的桌面与 390px 移动端缩放。发布后的生产页面检查覆盖全部卡片、搜索、背景切换、描边色、详情、暂停、精确 SVG 复制和移动布局；总览通过独立渲染及 CDN 内容比对验证。

可立即查看总览：`https://fx-lab-cdn.ticoag.fun/themes/witch-alchemy/sheet.svg?preview=2026-10-11-refined`。当前账号无 CDN 清缓存权限，普通地址仍可能命中一天的旧缓存；预览查询键已逐对象核对为本次发布内容。

原稿备份在 `.data/svg-kits-backups/witch-alchemy-original-2026-10-11.tgz`。发布记录及最终检查报告在 `.data/svg-kits-releases/`。绘图与检查脚本、过程日志在 `/tmp/fx-lab-witch-refinement/`；旧 `verify-browser.mjs` 的暂停测试未通过，最终验收使用上述 `browser-check-full.mjs`。本轮验证覆盖 Chrome，未覆盖 Safari/Firefox。
