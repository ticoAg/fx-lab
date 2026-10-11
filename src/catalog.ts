import type { DemoItem, DemoSource, SourceId } from './types.ts'
import { animeDemos } from './demos/anime/demos.tsx'
import { reactbitsDemos } from './demos/reactbits/catalog.ts'
import { threeuiDemos } from './demos/threeui/catalog.ts'
import { curveDemos } from './demos/curves/catalog.ts'

export const ALL_DEMOS: DemoItem[] = [
  ...animeDemos,
  ...reactbitsDemos,
  ...threeuiDemos,
  ...curveDemos,
]

export type SourceMeta = {
  id: DemoSource
  label: string
  title: { zh: string; en: string }
  desc: { zh: string; en: string }
  tag: string
  color: string
}

export const SOURCE_METAS: SourceMeta[] = [
  {
    id: 'animejs',
    label: 'anime.js',
    title: { zh: 'anime.js 官方演示', en: 'anime.js Official Engine' },
    desc: {
      zh: '轻量高效的 JS 动效引擎，支持复杂时间线编排、交错动画、SVG 路径描边与弹簧物理。',
      en: 'Lightweight JS animation engine featuring timeline orchestration, staggers, SVG draw, and springs.',
    },
    tag: 'Engine',
    color: '#f59e0b',
  },
  {
    id: 'react-bits',
    label: 'react-bits',
    title: { zh: 'react-bits 动效组件', en: 'react-bits UI & Motion' },
    desc: {
      zh: '前沿现代 React 动效库，涵盖光标交互、背景流体、文字特效、卡片微交互与视觉组件。',
      en: 'Modern animated React components: fluid backgrounds, cursor followers, text morphs, and cards.',
    },
    tag: 'Components',
    color: '#6366f1',
  },
  {
    id: 'threeui',
    label: 'ThreeUI',
    title: { zh: 'ThreeUI 3D 界面', en: 'ThreeUI 3D & Spatial' },
    desc: {
      zh: '基于 Three.js / R3F 构建的高性能 3D 空间交互界面、着色器特效与视口空间元素。',
      en: 'Spatial 3D interface components and shader materials built on Three.js and React Three Fiber.',
    },
    tag: '3D / WebGL',
    color: '#10b981',
  },
  {
    id: 'math-curve-loaders',
    label: 'math-curve-loaders',
    title: { zh: '数学曲线加载器', en: 'Mathematical Curves' },
    desc: {
      zh: '基于经典数学参数曲线方程计算渲染的动效加载器，优雅呈现物理数学之美。',
      en: 'Parametric math curve loaders calculated with pure geometry and easing equations.',
    },
    tag: 'Curves',
    color: '#ec4899',
  },
]

export const SOURCES: { id: SourceId; label: string }[] = [
  { id: 'all', label: '全部' },
  ...SOURCE_METAS.map((m) => ({ id: m.id as SourceId, label: m.label })),
]

export function filterDemos(source: SourceId, q: string) {
  const query = q.trim().toLowerCase()
  return ALL_DEMOS.filter((d) => {
    if (source !== 'all' && d.source !== source) return false
    if (!query) return true
    return (
      d.name.toLowerCase().includes(query) ||
      d.zh.toLowerCase().includes(query) ||
      d.en.toLowerCase().includes(query) ||
      d.id.toLowerCase().includes(query)
    )
  })
}
