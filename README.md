# 运动实验室 · fx-lab

Vite + React 动效馆。四个库里能跑的官方组件挂成画廊，点进去是真实 import 和用法。

线上：https://fx-lab.ticoag.fun/
仓库：https://github.com/ticoAg/fx-lab

## 来源
- anime.js：14 个官方 API 演示
- react-bits：官方 JS-CSS 组件，约 166 个
- ThreeUI：Community 包，100 个导出
- math-curve-loaders：官方 21 条曲线
- SVG Kits：按主题整理的动画 SVG 图标套件，入口 [/svg-kits](https://fx-lab.ticoag.fun/svg-kits)。种子含 basics、cthulhu-mythos，以及去掉圆角底板、主描边改为 currentColor 的 pastoral、line-basics、druid、forest。healing 没有生成，不在种子里。新主题仍从网站上传。

默认中文，可切英文。卡片进视口才挂载。失败卡是官方组件没跑起来，不是自制替代。

## 本地

安装依赖并启动开发服务器。

## 构建

生产构建，产物在 dist。`npm run build` 会先跑 `check:svg-kits`（校验种子主题，不是线上存储）。

## 部署

Cloudflare Pages 项目 fx-lab。构建输出 dist，Node 20。
GitHub main 已绑定 Git 源，push 到 main 自动部署。
生产域名 fx-lab.ticoag.fun。Pages 默认域名 fx-lab-5do.pages.dev 仍可用。
构建命令只在 Pages 控制台配置，wrangler.toml 不放 `[build]`。
架构、配置位置与坑：[docs/deploy.md](docs/deploy.md)
SVG Kits 存储与上传：[docs/svg-kits.md](docs/svg-kits.md)

## 说明

详情弹层带用法代码。WebGL 同时最多 4 路。只收录各库免费/社区部分。

## 命令

```
npm install
npm run dev
npm run build
npm run seed:svg-kits
```

## SVG Kits

线上：https://fx-lab.ticoag.fun/svg-kits

- `/svg-kits` 主题列表
- `/svg-kits/<themeId>` 主题页（搜索、分类。网格背景可切深色 / 浅色 / 透明，线条色用取色器，分别记在 `?bg=`、`?stroke=` 和 localStorage。`currentColor` 读 `--svg-kit-stroke`，深色网格默认浅色线条）
- `?icon=<iconId>` 打开某个图标详情（动画预览可暂停、背景跟随页面、复制 SVG、下载、复制 `<img>`）
- `/svg-kits/admin` 上传：创建主题、一次选多个 SVG、填每个图标的 zh/en 标题和描述，写入对象存储

画廊读 `/api/svg-kits`。线上 R2 里已有的主题会盖过同名种子，所以合并后要把种子再写入 R2，透明图标才会出现在线上。`npm run build:svg-kits` 会去掉种子里的圆角底板并把主描边改成 currentColor。以后全新主题仍走上传页。
