import { animeSetups } from './demos/anime/demos.tsx'
import { ReactBitsMount } from './demos/reactbits/ReactBitsMount.tsx'
import { ThreeUIMount } from './demos/threeui/ThreeUIMount.tsx'
import { CurveDemo } from './demos/curves/CurveDemo.tsx'
import { officialCurves } from './demos/curves/catalog.ts'
import type { DemoItem } from './types.ts'

export function DemoMount({ item }: { item: DemoItem }) {
  if (item.source === 'animejs') {
    const found = animeSetups.find((d) => d.id === item.id)
    if (!found) return <div className="fail-card">未找到 anime 演示</div>
    const Demo = found.Demo
    return <Demo />
  }
  if (item.source === 'react-bits') {
    return <ReactBitsMount name={item.name} />
  }
  if (item.source === 'threeui') {
    return <ThreeUIMount exportName={item.name} />
  }
  const curve = officialCurves.find((c) => c.name === item.name)
  if (!curve) return <div className="fail-card">未找到曲线</div>
  return <CurveDemo config={curve} />
}
