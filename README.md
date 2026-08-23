# 运动实验室 · fx-lab

Vite + React 动效馆。四个库里能跑的官方组件挂成画廊，点进去是真实 import 和用法。

线上：https://fx-lab-5do.pages.dev/
仓库：https://github.com/ticoAg/fx-lab

## 来源
- anime.js：14 个官方 API 演示
- react-bits：官方 JS-CSS 组件，约 166 个
- ThreeUI：Community 包，100 个导出
- math-curve-loaders：官方 21 条曲线

默认中文，可切英文。卡片进视口才挂载。失败卡是官方组件没跑起来，不是自制替代。

## 本地

安装依赖并启动开发服务器。

## 构建

生产构建，产物在 dist。

## 部署

Cloudflare Pages。构建输出 dist，Node 20。
本机可用 wrangler 发布到项目 fx-lab。
生产域名 fx-lab-5do.pages.dev。
CLI 无法绑定 Git 源；push 自动部署需在控制台连接仓库 ticoAg/fx-lab。

## 说明

详情弹层带用法代码。WebGL 同时最多 4 路。只收录各库免费/社区部分。

## 命令

npm install
npm run dev
npm run build
