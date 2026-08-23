export type SourceId = 'all' | 'animejs' | 'react-bits' | 'threeui' | 'math-curve-loaders'

export type DemoSource = Exclude<SourceId, 'all'>

export type DemoItem = {
  id: string
  source: DemoSource
  name: string
  zh: string
  en: string
  webgl: boolean
  code: string
}
