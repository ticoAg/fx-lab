# 都市传说 · 夜间故事书

完成 24/24 张插画的结构重绘。采用石油蓝、板岩灰、骨白、铜绿与琥珀暖光，少量灰红色保留怪谈线索。建筑和电器增加透视与厚度，人物区分头发、皮肤和衣褶，动物补足体态和羽毛结构；高光与接触阴影服务具体材质。透明背景，无通用底板、外部素材或整幅光效。

材质、玻璃、月亮和阴影使用固定色；`currentColor` 仅用于少量轮廓细节。所有 SVG 均为独立文件，保留原 `0 0 80 80` viewBox，包含可访问标题及说明。CSS 动画与引用均以 `urban-legend-<icon-id>-` 命名，继承宿主暂停状态，并支持 `prefers-reduced-motion`。

原有 24 个 ID、标题、顺序、分类、标签、动效元数据、封面和 `kind: illustration` 完整保留；只更新描述以符合最终画面。`manifest.sheet` 保留 `elements.svg`，总览已由主流程生成。

预览：

- [浅色背景](preview-light.png)：24 张，每张同时展示 320px 与 80px。
- [深色背景](preview-dark.png)：同上。
- [前后对比](comparison.png)：8 组，原稿与细化均为 240px、相同背景与轮廓色。

2026-10-11 实际验证结果：

| 检查 | 结果 |
| --- | --- |
| 原件备份 | 完整 API 响应、manifest、24 个 SVG、原总览；27 个文件与归档逐字节一致 |
| XML、安全、引用与命名 | 24/24 通过；156 个 ID 全局唯一；无脚本、外部资源、图片、字体、foreignObject |
| 元数据、viewBox、实质变化 | 24/24 通过；每张超过 80% 的路径几何与原件不同 |
| 文件预算 | 最大 10,104 字节、106 个 XML 元素；上限为 163,840 字节、2,500 个元素 |
| 独立 SVG 加载 | Chrome 155.0.8059.39，24 × 明暗背景 × 80/320px，共 96 组通过 |
| 内联画廊预览 | 全部 24 张在明暗背景的 80/320px 接触表中人工查看；完成第二轮细化 |
| 宿主暂停、恢复、减少动态效果 | 24/24 通过；暂停后时间不再推进，恢复后继续，减少动态效果下无运行中的动画 |
| 动画边距 | 120 个相位截图，含超出 SVG viewport 的可见区域检查；最小透明边距 4.25 个 viewBox 单位 |
| 浏览器错误、外部请求 | 均为 0 |

实际执行的检查与预览命令（工作目录为仓库根目录）：

```sh
python3 /tmp/fx-lab-urban-refinement/validate.py > /tmp/fx-lab-urban-refinement/static-validation.log 2>&1
node /tmp/fx-lab-urban-refinement/browser-check.mjs > /tmp/fx-lab-urban-refinement/browser-validation.log 2>&1
python3 /tmp/fx-lab-urban-refinement/check-margins.py > /tmp/fx-lab-urban-refinement/margin-validation.log 2>&1
node /tmp/fx-lab-urban-refinement/preview.mjs > /tmp/fx-lab-urban-refinement/final-render.log 2>&1
```

机器可读结果位于同一临时目录的 `static-validation.json`、`browser-validation.json`、`margin-validation.json`；动画相位原图在 `phases/`。临时绘制源为 `generate.py`。这些脚本与日志仅保留在本机临时目录，不属于上传资产。

原件位于 `/tmp/fx-lab-urban-refinement/original/`。持久备份为仓库内 `.data/svg-kits-backups/urban-legend-original-2026-10-11.tgz`，在编辑前创建。

2026-10-11 已发布到 R2 桶 `fx-lab-svg-kits` 的 `themes/urban-legend/`：24 个图标、manifest 与总览，共 26 个对象。`elements.svg` 已生成，验证了画廊 CSS 下的桌面与 390px 移动端缩放。发布后的生产页面检查覆盖全部卡片、搜索、背景切换、描边色、详情、暂停、精确 SVG 复制和移动布局；总览通过独立渲染及 CDN 内容比对验证。

可立即查看总览：`https://fx-lab-cdn.ticoag.fun/themes/urban-legend/sheet.svg?preview=2026-10-11-refined`。当前账号无 CDN 清缓存权限，普通地址仍可能命中一天的旧缓存；预览查询键已逐对象核对为本次发布内容。发布记录及最终检查报告在 `.data/svg-kits-releases/`。

未修改应用逻辑或共享总览构建器，未提交 Git；本轮浏览器验证覆盖 Chrome，未验证 Safari/Firefox。
