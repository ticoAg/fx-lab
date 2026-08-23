// @ts-nocheck
import { useEffect, useRef, type ReactNode } from 'react'
import {
  animate,
  createDraggable,
  createSpring,
  createTimeline,
  createTimer,
  splitText,
  stagger,
  svg,
  utils,
} from 'animejs'
import type { DemoItem } from '../../types.ts'

function useAnime(setup: (root: HTMLElement) => { revert?: () => void } | void) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const root = ref.current
    if (!root) return
    const ctl = setup(root)
    return () => {
      ctl?.revert?.()
      animate(root.querySelectorAll('*'), { autoplay: false })
    }
  }, [setup])
  return ref
}

export function StaggerGrid() {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const root = ref.current
    if (!root) return
    const anim = animate(root.querySelectorAll('i'), {
      scale: [{ to: 1.6 }, { to: 1 }],
      opacity: [{ to: 1 }, { to: 0.35 }],
      delay: stagger(40, { grid: [8, 8], from: 'center' }),
      duration: 700,
      ease: 'inOut(3)',
      loop: true,
    })
    return () => { anim.pause() }
  }, [])
  return (
    <div ref={ref} className="anime-stage">
      <div className="stagger-grid">
        {Array.from({ length: 64 }, (_, i) => (
          <i key={i} />
        ))}
      </div>
    </div>
  )
}

export function TimelineBoxes() {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const root = ref.current
    if (!root) return
    const tl = createTimeline({ loop: true, defaults: { duration: 600, ease: 'out(3)' } })
    tl.add(root.querySelector('.a') as HTMLElement, { x: 70, scale: 1.2 })
      .add(root.querySelector('.b'), { x: 70, background: '#22d3ee' }, '-=200')
      .add(root.querySelector('.c'), { x: 70, rotate: 180 }, '-=200')
      .add(root.querySelectorAll('.ball'), { x: 0, scale: 1, rotate: 0, background: '#818cf8' })
    return () => { tl.pause() }
  }, [])
  return (
    <div ref={ref} className="anime-stage" style={{ gap: 10 }}>
      <div className="ball a" />
      <div className="ball b" />
      <div className="ball c" />
    </div>
  )
}

export function SvgDraw() {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const root = ref.current
    if (!root) return
    const line = root.querySelector('path')
    if (!line) return
    svg.createDrawable(line)
    const anim = animate(line, {
      draw: ['0 0', '0 1', '1 1'],
      ease: 'inOut(3)',
      duration: 2200,
      loop: true,
    })
    return () => { anim.pause() }
  }, [])
  return (
    <div ref={ref} className="anime-stage">
      <svg viewBox="0 0 120 80" width="220" height="150" fill="none">
        <path d="M10 60 C 30 10, 90 10, 110 60" stroke="#818cf8" strokeWidth="4" />
      </svg>
    </div>
  )
}

export function SpringBall() {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const root = ref.current
    if (!root) return
    const anim = animate(root.querySelector('.ball') as HTMLElement, {
      y: [-40, 40],
      ease: createSpring({ stiffness: 120, damping: 8 }),
      loop: true,
      alternate: true,
    })
    return () => { anim.pause() }
  }, [])
  return (
    <div ref={ref} className="anime-stage">
      <div className="ball" />
    </div>
  )
}

export function KeyframesBox() {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const root = ref.current
    if (!root) return
    const anim = animate(root.querySelector('.demo-tile') as HTMLElement, {
      keyframes: [
        { x: 40, rotate: 10 },
        { y: -24, scale: 1.1 },
        { x: 0, y: 0, rotate: 0, scale: 1 },
      ],
      duration: 1800,
      ease: 'inOut(2)',
      loop: true,
    })
    return () => { anim.pause() }
  }, [])
  return (
    <div ref={ref} className="anime-stage">
      <div className="demo-tile">关键帧</div>
    </div>
  )
}

export function Letters() {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const root = ref.current
    if (!root) return
    const split = splitText(root.querySelector('.letters')!, { chars: true })
    const anim = animate(split.chars, {
      y: [20, 0],
      opacity: [0, 1],
      delay: stagger(40),
      duration: 700,
      ease: 'out(3)',
      loop: true,
      alternate: true,
    })
    return () => { anim.pause() }
  }, [])
  return (
    <div ref={ref} className="anime-stage">
      <div className="letters" style={{ fontSize: 28, fontWeight: 800 }}>
        运动实验室
      </div>
    </div>
  )
}

export function PathFollow() {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const root = ref.current
    if (!root) return
    const path = root.querySelector('path')
    const dot = root.querySelector('.follow')
    if (!path || !dot) return
    const motion = svg.createMotionPath(path)
    const anim = animate(dot, {
      ...motion,
      duration: 2600,
      ease: 'linear',
      loop: true,
    })
    return () => { anim.pause() }
  }, [])
  return (
    <div ref={ref} className="anime-stage">
      <svg viewBox="0 0 120 80" width="220" height="150" fill="none">
        <path d="M12 64 C 28 12, 88 12, 108 64 S 40 70, 12 64" stroke="#312e81" strokeWidth="3" />
        <circle className="follow" r="5" fill="#818cf8" />
      </svg>
    </div>
  )
}

export function UtilsRandom() {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const root = ref.current
    if (!root) return
    const anim = animate(root.querySelectorAll('.ball'), {
      x: () => utils.random(-50, 50),
      y: () => utils.random(-30, 30),
      scale: () => utils.random(0.6, 1.3, 2),
      duration: 900,
      ease: 'out(3)',
      loop: true,
      alternate: true,
    })
    return () => { anim.pause() }
  }, [])
  return (
    <div ref={ref} className="anime-stage" style={{ display: 'flex', gap: 14 }}>
      <div className="ball" />
      <div className="ball" />
      <div className="ball" />
    </div>
  )
}

export function AlternatePulse() {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const root = ref.current
    if (!root) return
    const anim = animate(root.querySelector('.demo-tile') as HTMLElement, {
      scale: [1, 1.18],
      opacity: [0.55, 1],
      duration: 900,
      ease: 'inOut(3)',
      loop: true,
      alternate: true,
    })
    return () => { anim.pause() }
  }, [])
  return (
    <div ref={ref} className="anime-stage">
      <div className="demo-tile">呼吸</div>
    </div>
  )
}

export function DraggableBox() {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const root = ref.current
    if (!root) return
    const el = root.querySelector('.demo-tile') as HTMLElement
    const drag = createDraggable(el, { container: root })
    return () => { drag.disable() }
  }, [])
  return (
    <div ref={ref} className="anime-stage">
      <div className="demo-tile">拖我</div>
    </div>
  )
}

export function MorphPath() {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const root = ref.current
    if (!root) return
    const a = root.querySelector('.from') as SVGPathElement
    const b = root.querySelector('.to') as SVGPathElement
    if (!a || !b) return
    const anim = animate(a, {
      d: svg.morphTo(b),
      duration: 1600,
      ease: 'inOut(3)',
      loop: true,
      alternate: true,
    })
    return () => { anim.pause() }
  }, [])
  return (
    <div ref={ref} className="anime-stage">
      <svg viewBox="0 0 100 100" width="160" height="160">
        <path className="from" fill="#6366f1" d="M20 50 Q 50 10 80 50 Q 50 90 20 50" />
        <path className="to" fill="none" d="M20 20 H80 V80 H20 Z" />
      </svg>
    </div>
  )
}

export function EngineTimer() {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const root = ref.current
    if (!root) return
    const label = root.querySelector('.count') as HTMLElement
    const timer = createTimer({
      duration: 2000,
      loop: true,
      onUpdate: (self) => {
        label.textContent = `${Math.round(self.progress * 100)}%`
      },
    })
    return () => { timer.pause() }
  }, [])
  return (
    <div ref={ref} className="anime-stage">
      <div className="demo-tile count">0%</div>
    </div>
  )
}

export function StaggerColors() {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const root = ref.current
    if (!root) return
    const anim = animate(root.querySelectorAll('i'), {
      background: stagger(['#6366f1', '#22d3ee']),
      y: stagger([-8, 8]),
      duration: 1000,
      loop: true,
      alternate: true,
      ease: 'inOut(2)',
    })
    return () => { anim.pause() }
  }, [])
  return (
    <div ref={ref} className="anime-stage">
      <div className="stagger-grid" style={{ gridTemplateColumns: 'repeat(6, 16px)' }}>
        {Array.from({ length: 18 }, (_, i) => (
          <i key={i} />
        ))}
      </div>
    </div>
  )
}

export function SvgStrokeDash() {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const root = ref.current
    if (!root) return
    const el = root.querySelector('circle')
    if (!el) return
    svg.createDrawable(el)
    const anim = animate(el, {
      draw: ['0 0.15', '0.85 1'],
      rotate: 360,
      duration: 1800,
      ease: 'linear',
      loop: true,
    })
    return () => { anim.pause() }
  }, [])
  return (
    <div ref={ref} className="anime-stage">
      <svg viewBox="0 0 80 80" width="140" height="140">
        <circle cx="40" cy="40" r="24" fill="none" stroke="#818cf8" strokeWidth="6" />
      </svg>
    </div>
  )
}

export const animeSetups: Array<{
  id: string
  zh: string
  en: string
  Demo: () => ReactNode
  code: string
}> = [
  {
    id: 'anime-stagger-grid',
    zh: '交错网格',
    en: 'Stagger grid',
    Demo: StaggerGrid,
    code: `import { animate, stagger } from 'animejs'\n\nanimate('.cell', {\n  scale: [{ to: 1.6 }, { to: 1 }],\n  delay: stagger(40, { grid: [8, 8], from: 'center' }),\n  duration: 700,\n  loop: true,\n})`,
  },
  {
    id: 'anime-timeline',
    zh: '时间线',
    en: 'Timeline',
    Demo: TimelineBoxes,
    code: `import { createTimeline } from 'animejs'\n\nconst tl = createTimeline({ loop: true })\ntl.add('.a', { x: 70 }).add('.b', { x: 70 }, '-=200').add('.c', { rotate: 180 })`,
  },
  {
    id: 'anime-svg-draw',
    zh: 'SVG 描边',
    en: 'SVG draw',
    Demo: SvgDraw,
    code: `import { animate, svg } from 'animejs'\n\nsvg.createDrawable('path')\nanimate('path', { draw: ['0 0', '0 1', '1 1'], duration: 2200, loop: true })`,
  },
  {
    id: 'anime-spring',
    zh: '弹簧',
    en: 'Spring',
    Demo: SpringBall,
    code: `import { animate, createSpring } from 'animejs'\n\nanimate('.ball', {\n  y: [-40, 40],\n  ease: createSpring({ stiffness: 120, damping: 8 }),\n  loop: true,\n  alternate: true,\n})`,
  },
  {
    id: 'anime-keyframes',
    zh: '关键帧',
    en: 'Keyframes',
    Demo: KeyframesBox,
    code: `import { animate } from 'animejs'\n\nanimate('.tile', {\n  keyframes: [{ x: 40 }, { y: -24 }, { x: 0, y: 0 }],\n  duration: 1800,\n  loop: true,\n})`,
  },
  {
    id: 'anime-letters',
    zh: '逐字显现',
    en: 'Split letters',
    Demo: Letters,
    code: `import { animate, splitText, stagger } from 'animejs'\n\nconst split = splitText('.title', { chars: true })\nanimate(split.chars, { y: [20, 0], opacity: [0, 1], delay: stagger(40), loop: true })`,
  },
  {
    id: 'anime-path-follow',
    zh: '路径跟随',
    en: 'Path follow',
    Demo: PathFollow,
    code: `import { animate, svg } from 'animejs'\n\nconst motion = svg.createMotionPath('path')\nanimate('.dot', { ...motion, duration: 2600, loop: true, ease: 'linear' })`,
  },
  {
    id: 'anime-utils-random',
    zh: '随机工具',
    en: 'utils.random',
    Demo: UtilsRandom,
    code: `import { animate, utils } from 'animejs'\n\nanimate('.ball', {\n  x: () => utils.random(-50, 50),\n  y: () => utils.random(-30, 30),\n  loop: true,\n  alternate: true,\n})`,
  },
  {
    id: 'anime-pulse',
    zh: '交替呼吸',
    en: 'Alternate pulse',
    Demo: AlternatePulse,
    code: `import { animate } from 'animejs'\n\nanimate('.tile', { scale: [1, 1.18], duration: 900, loop: true, alternate: true })`,
  },
  {
    id: 'anime-draggable',
    zh: '可拖拽',
    en: 'Draggable',
    Demo: DraggableBox,
    code: `import { createDraggable } from 'animejs'\n\ncreateDraggable('.tile', { container: '.stage' })`,
  },
  {
    id: 'anime-morph',
    zh: '路径变形',
    en: 'SVG morph',
    Demo: MorphPath,
    code: `import { animate, svg } from 'animejs'\n\nanimate('.from', { d: svg.morphTo('.to'), duration: 1600, loop: true, alternate: true })`,
  },
  {
    id: 'anime-timer',
    zh: '计时器',
    en: 'createTimer',
    Demo: EngineTimer,
    code: `import { createTimer } from 'animejs'\n\ncreateTimer({\n  duration: 2000,\n  loop: true,\n  onUpdate: (self) => { label.textContent = Math.round(self.progress * 100) + '%' },\n})`,
  },
  {
    id: 'anime-stagger-color',
    zh: '交错颜色',
    en: 'Stagger colors',
    Demo: StaggerColors,
    code: `import { animate, stagger } from 'animejs'\n\nanimate('.cell', {\n  background: stagger(['#6366f1', '#22d3ee']),\n  y: stagger([-8, 8]),\n  loop: true,\n  alternate: true,\n})`,
  },
  {
    id: 'anime-loader',
    zh: '圆环加载',
    en: 'Drawable loader',
    Demo: SvgStrokeDash,
    code: `import { animate, svg } from 'animejs'\n\nsvg.createDrawable('circle')\nanimate('circle', { draw: ['0 0.15', '0.85 1'], rotate: 360, duration: 1800, loop: true })`,
  },
]

export const animeDemos: DemoItem[] = animeSetups.map((item) => ({
  id: item.id,
  source: 'animejs',
  name: item.en,
  zh: item.zh,
  en: item.en,
  webgl: false,
  code: item.code,
}))
