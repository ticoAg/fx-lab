import json
from pathlib import Path

three = [
("AmberHalftone","琥珀半调"),
("AnimatedTopDock","顶部坞"),
("AudioWordmark","音频字标"),
("BallStudy","球体研究"),
("BellFieldBackground","钟形场"),
("BestsellersBookShowcase","畅销书橱窗"),
("BookshelfScene","书架场景"),
("BrandOrbs","品牌光球"),
("CharacterCarousel","角色轮播"),
("CharacterFilmstrip","角色胶片"),
("CharacterWave","角色波浪"),
("CircleButtons","圆形按钮"),
("ClothStudy","布料研究"),
("CloudField","云场"),
("CompleteShelfLandingPage","完整货架页"),
("CondensationBackground","冷凝背景"),
("ConnectivityGraph","连接图"),
("ConstellationField","星座场"),
("CrtBackground","CRT 背景"),
("DataField","数据场"),
("DefenseLines","防线"),
("DiagnosticsPanel","诊断面板"),
("DimensionalField","维度场"),
("DotBorderButton","点阵边框按钮"),
("DotMatrixBackground","点阵背景"),
("ElementsBackground","元素背景"),
("ElementsCollection","元素合集"),
("EmberStorm","余烬风暴"),
("EmeraldHorizonBackground","翡翠地平线"),
("EngravedCertificate","雕刻证书"),
("ExpanseField","广袤场"),
("FloatingDotsCta","漂浮点 CTA"),
("FlowField","流场"),
("FluidFieldBackground","流体场"),
("FluxVortex","通量漩涡"),
("Gallery","画廊"),
("GalleryHeading","画廊标题"),
("GatewayFlow","门户流"),
("GenerateButton","生成按钮"),
("GenerativeTree","生成树"),
("GlassmorphismCta","玻璃拟态 CTA"),
("GlobeCollection","地球合集"),
("GradientBeamCta","渐变光束 CTA"),
("GradientCta","渐变 CTA"),
("GradientPillButton","渐变胶囊按钮"),
("HalftoneFlow","半调流"),
("IgnitionButton","点火按钮"),
("InductionButton","感应按钮"),
("InterfaceLines","界面线"),
("JapaneseTowerLandscape","塔景"),
("KageLandingPage","影落地页"),
("KoiStudies","锦鲤研究"),
("LandscapeScene","风景场景"),
("LaserCollection","激光合集"),
("LaunchButton","发射按钮"),
("LiquidFormBackground","液态形态"),
("LiquidMetalButton","液态金属按钮"),
("LogicCoreField","逻辑核心场"),
("LumenCta","流明 CTA"),
("MengToSketchbookLandingPage","速写本落地页"),
("MorphingGlyphCloud","字形云"),
("NebulaBackground","星云背景"),
("NeonTypography","霓虹字体"),
("OrbitalSphereBackground","轨道球体"),
("OutlineTypeflow","轮廓字流"),
("ParticleDrift","粒子漂移"),
("ParticleNetwork","粒子网络"),
("ParticleWordmark","粒子字标"),
("PerformanceGauges","性能仪表"),
("PlasmaButton","等离子按钮"),
("PortalFieldCollection","传送门场"),
("PredictiveArcCanvas","预测弧"),
("RectangleButtons","矩形按钮"),
("RibbonFieldBackground","缎带场"),
("RippleStudy","涟漪研究"),
("SemanticBloom","语义绽放"),
("ShaderButtons","着色器按钮"),
("Sketchbook","速写本"),
("SkeuomorphicToggle","拟物开关"),
("SlidingTextCta","滑动文字 CTA"),
("SparkBadge","火花徽章"),
("SpinningBorderButton","旋转边框按钮"),
("StreamConvergenceBackground","流汇聚"),
("StructureFlowCollection","结构流"),
("SylvaHero","希尔瓦主视觉"),
("SylvaLivingWorldScene","希尔瓦世界"),
("TactileButton","触觉按钮"),
("TempleNightScene","夜寺"),
("TextAnimationCollection","文字动画合集"),
("TextPathStudies","文字路径"),
("ThinkingButton","思考按钮"),
("ThreeUIIntro","ThreeUI 介绍"),
("TopoField","地形场"),
("TopologyField","拓扑场"),
("TypographyVortexCanvas","字体漩涡"),
("UplinkLoader","上行加载"),
("VoidField","虚空场"),
("WarpFieldBackground","扭曲场"),
("WireframeForms","线框形体"),
("WovenCloth","编织布"),
]

lines = ["import type { DemoItem } from '../../types.ts'\n", "export const THREEUI_EXPORTS = [\n"]
for name, zh in three:
    lines.append(f"  {{ exportName: '{name}', zh: '{zh}' }},\n")
lines.append("] as const\n\n")
lines.append("export const threeuiDemos: DemoItem[] = THREEUI_EXPORTS.map((item) => ({\n")
lines.append("  id: `threeui-${item.exportName}`,\n")
lines.append("  source: 'threeui',\n")
lines.append("  name: item.exportName,\n")
lines.append("  zh: item.zh,\n")
lines.append("  en: item.exportName,\n")
lines.append("  webgl: true,\n")
lines.append("  code: `import { ${item.exportName} } from '@designcodeio/threeui/components/${item.exportName}'\\n\\nexport function Preview() {\\n  return (\\n    <div className=\\\"stage\\\">\\n      <${item.exportName} sourceUrl=\\\"/\\\" assetBaseUrl=\\\"/\\\" />\\n    </div>\\n  )\\n}\\n`,\n")
lines.append("}))\n")
Path("/workspace/fx-lab/src/demos/threeui/catalog.ts").write_text("".join(lines))

# loaders
load_lines = ["export const threeuiLoaders: Record<string, () => Promise<Record<string, unknown>>> = {\n"]
for name, _ in three:
    load_lines.append(f"  {name}: () => import('@designcodeio/threeui/components/{name}'),\n")
load_lines.append("}\n")
Path("/workspace/fx-lab/src/demos/threeui/loaders.ts").write_text("".join(load_lines))

# mount
Path("/workspace/fx-lab/src/demos/threeui/ThreeUIMount.tsx").write_text("""import { useEffect, useState, type ComponentType } from 'react'
import { threeuiLoaders } from './loaders.ts'

export function ThreeUIMount({ exportName }: { exportName: string }) {
  const [Comp, setComp] = useState<ComponentType<Record<string, unknown>> | null>(null)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    const load = threeuiLoaders[exportName]
    if (!load) {
      setErr('export not found')
      return
    }
    load()
      .then((mod) => {
        if (!alive) return
        const C = (mod[exportName] || mod.default) as ComponentType<Record<string, unknown>>
        if (!C) throw new Error('named export missing')
        setComp(() => C)
      })
      .catch((e: Error) => {
        if (alive) setErr(e.message || String(e))
      })
    return () => {
      alive = false
    }
  }, [exportName])

  if (err) throw new Error(err)
  if (!Comp) return <div className="lazy-placeholder">加载 ThreeUI…</div>
  return <Comp sourceUrl="/" assetBaseUrl="/" />
}
""")

# react-bits
meta = json.loads(Path("/workspace/fx-lab/scripts/rb-meta.json").read_text())
# extra image-ish defaults
IMAGES = ["/ph/1.svg", "/ph/2.svg", "/ph/3.svg", "/ph/4.svg"]
# Props the generic guesses get wrong: required props the prop scan misses, and `items` that must be objects, not strings.
PROP_FIXES = {
    "Ballpit": {"colors": ["#6366f1", "#818cf8", "#e8e9f0"]},
    "Counter": {"value": 2026, "fontSize": 64},
    "VariableProximity": {
        "label": "近距变体字",
        "fromFontVariationSettings": "'wght' 400, 'opsz' 9",
        "toFontVariationSettings": "'wght' 1000, 'opsz' 40",
        "radius": 100,
    },
    "Threads": {"color": [0.388, 0.4, 0.945]},
    "MaskedHeading": {"src": IMAGES[0]},
    "ScrollExpand": {"src": IMAGES[1]},
    "FlyingPosters": {"items": IMAGES},
    "ImageTrail": {"items": IMAGES},
    "AccordionGallery": {"items": [{"image": IMAGES[i], "label": f"手风琴画廊 {i + 1}"} for i in range(4)]},
    "CircularGallery": {"items": [{"image": IMAGES[i], "text": f"环形画廊 {i + 1}"} for i in range(4)]},
    "DepthCarousel": {"items": [{"image": IMAGES[i], "alt": f"景深轮播 {i + 1}"} for i in range(4)]},
    "DriftWall": {"items": [{"image": IMAGES[i], "title": f"漂移墙 {i + 1}", "href": f"#drift-{i + 1}"} for i in range(4)]},
    "MorphSlider": {"items": [{"image": IMAGES[i], "caption": f"变形滑块 {i + 1}"} for i in range(4)]},
    "InfiniteMenu": {
        "items": [
            {"image": IMAGES[i], "link": f"#item-{i + 1}", "title": f"项目 {i + 1}", "description": "react-bits"}
            for i in range(4)
        ]
    },
    "Masonry": {
        "items": [
            {"id": str(i + 1), "img": IMAGES[i % 4], "url": "#", "height": h}
            for i, h in enumerate([400, 300, 500, 350, 450, 320])
        ]
    },
    "FlowingMenu": {
        "items": [
            {"link": "#motion", "text": "运动", "image": IMAGES[0]},
            {"link": "#lab", "text": "实验室", "image": IMAGES[1]},
            {"link": "#components", "text": "组件", "image": IMAGES[2]},
        ]
    },
    "GlassIcons": {
        "items": [
            {"icon": "A", "color": "blue", "label": "一"},
            {"icon": "B", "color": "purple", "label": "二"},
            {"icon": "C", "color": "indigo", "label": "三"},
        ]
    },
    "BubbleMenu": {
        "items": [
            {"label": "首页", "href": "#home", "ariaLabel": "首页", "rotation": -8, "hoverStyles": {"bgColor": "#6366f1", "textColor": "#ffffff"}},
            {"label": "组件", "href": "#components", "ariaLabel": "组件", "rotation": 8, "hoverStyles": {"bgColor": "#818cf8", "textColor": "#ffffff"}},
            {"label": "关于", "href": "#about", "ariaLabel": "关于", "rotation": -8, "hoverStyles": {"bgColor": "#4f46e5", "textColor": "#ffffff"}},
        ]
    },
    "CardNav": {
        "items": [
            {"label": label, "bgColor": "#1c1f2b", "textColor": "#e8e9f0", "links": [{"label": f"{label}列表", "href": f"#{slug}", "ariaLabel": label}]}
            for label, slug in [("组件", "components"), ("曲线", "curves"), ("关于", "about")]
        ]
    },
    "StaggeredMenu": {
        "items": [
            {"label": "首页", "ariaLabel": "首页", "link": "#home"},
            {"label": "组件", "ariaLabel": "组件", "link": "#components"},
            {"label": "关于", "ariaLabel": "关于", "link": "#about"},
        ]
    },
}
for item in meta:
    name = item["name"]
    props = set(item.get("props") or [])
    if any(k in props for k in ("images", "items", "cards")) and name in (
        "ImageTrail","Carousel","CircularGallery","DomeGallery","FlyingPosters",
        "BounceCards","Stack","TiltedCard","ChromaGrid","Masonry","OrbitImages",
        "AccordionGallery","DepthCarousel","MorphSlider","DriftWall","PixelTransition",
        "DecayCard","ProfileCard","StickerPeel",
    ):
        if "images" in props:
            item["defaults"]["images"] = IMAGES
        if name == "ChromaGrid":
            item["defaults"]["items"] = [
                {"image": IMAGES[i % 4], "title": f"项目 {i+1}", "subtitle": "react-bits", "borderColor": "#6366f1", "url": "#"}
                for i in range(6)
            ]
        if name == "AnimatedList":
            item["defaults"]["items"] = ["交错一项", "交错二项", "交错三项", "交错四项"]
    if name == "LogoLoop":
        item["defaults"]["logos"] = [
            {"src": IMAGES[0], "alt": "A"},
            {"src": IMAGES[1], "alt": "B"},
            {"src": IMAGES[2], "alt": "C"},
        ]
    if name in PROP_FIXES:
        item["defaults"].update(PROP_FIXES[name])
    if name == "RotatingText":
        item["defaults"]["texts"] = ["运动", "实验室", "前端"]
    if name == "TrueFocus":
        item["defaults"]["sentence"] = "官方 组件 实时 预览"
        item["defaults"].pop("text", None)
    if name == "TextType":
        item["defaults"]["text"] = ["正在输入官方组件", "react-bits"]
    if name == "SplitFlapText":
        item["defaults"]["text"] = "FX-LAB"
    if name == "CircularText":
        item["defaults"]["text"] = "官方组件 · 运动实验室 · "
    if name == "CurvedLoop":
        item["defaults"]["marqueeText"] = "数学曲线 · 官方组件 · "
        item["defaults"].pop("text", None)
    if name == "CountUp":
        item["defaults"] = {"to": 2026, "from": 0, "duration": 2}
    if name == "Dock":
        item["defaults"]["items"] = [
            {"icon": "A", "label": "一"},
            {"icon": "B", "label": "二"},
            {"icon": "C", "label": "三"},
        ]
    if name == "PillNav":
        item["defaults"]["items"] = [
            {"label": "首页", "href": "#home"},
            {"label": "组件", "href": "#components"},
        ]
    if name == "GooeyNav":
        item["defaults"]["items"] = [
            {"label": "首页", "href": "#"},
            {"label": "画廊", "href": "#"},
            {"label": "关于", "href": "#"},
        ]

# write defaults + catalog
cat_lines = ["import type { DemoItem } from '../../types.ts'\n\n"]
cat_lines.append("export type RbMeta = {\n  name: string\n  childrenKind: string | null\n  defaults: Record<string, unknown>\n  webgl: boolean\n}\n\n")
cat_lines.append("export const RB_META: Record<string, RbMeta> = {\n")
for item in meta:
    defaults = json.dumps(item["defaults"], ensure_ascii=False)
    ck = "null" if not item["childrenKind"] else json.dumps(item["childrenKind"])
    cat_lines.append(f"  {item['name']}: {{ name: {json.dumps(item['name'])}, childrenKind: {ck}, defaults: {defaults}, webgl: {str(item['webgl']).lower()} }},\n")
cat_lines.append("}\n\n")
cat_lines.append("export const reactbitsDemos: DemoItem[] = Object.values(RB_META).map((item) => {\n")
cat_lines.append("  const usage = buildUsage(item)\n")
cat_lines.append("  return {\n")
cat_lines.append("    id: `rb-${item.name}`,\n")
cat_lines.append("    source: 'react-bits',\n")
cat_lines.append("    name: item.name,\n")
cat_lines.append("    zh: ZH[item.name] || item.name,\n")
cat_lines.append("    en: item.name,\n")
cat_lines.append("    webgl: item.webgl,\n")
cat_lines.append("    code: usage,\n")
cat_lines.append("  }\n")
cat_lines.append("})\n\n")

zh_map = {item["name"]: item["zh"] for item in meta}
cat_lines.append("const ZH: Record<string, string> = {\n")
for k, v in zh_map.items():
    cat_lines.append(f"  {k}: {json.dumps(v, ensure_ascii=False)},\n")
cat_lines.append("}\n\n")
cat_lines.append("""function buildUsage(item: RbMeta): string {
  const props = Object.entries(item.defaults)
    .map(([k, v]) => `  ${k}={${JSON.stringify(v)}}`)
    .join('\\n')
  const child =
    item.childrenKind === 'button'
      ? '  <button type=\"button\">磁力按钮</button>'
      : item.childrenKind === 'text'
        ? '  渐变文字'
        : item.childrenKind === 'tile'
          ? '  <div className=\"demo-tile\">官方组件</div>'
          : ''
  const inner = [props, child].filter(Boolean).join('\\n')
  return `import ${item.name} from '@/react-bits/${item.name}/${item.name}.jsx'\\n\\nexport function Preview() {\\n  return (\\n    <${item.name}${inner ? `\\n${inner}\\n    ` : ' '}/>\\n  )\\n}\\n`
}
""")
Path("/workspace/fx-lab/src/demos/reactbits/catalog.ts").write_text("".join(cat_lines))

Path("/workspace/fx-lab/src/demos/reactbits/ReactBitsMount.tsx").write_text("""import { useEffect, useState, type ComponentType, type ReactNode } from 'react'
import { RB_META } from './catalog.ts'

const modules = import.meta.glob('../../react-bits/**/*.jsx')

function childFor(kind: string | null): ReactNode {
  if (kind === 'button') return <button className="demo-btn" type="button">磁力按钮</button>
  if (kind === 'text') return '渐变文字'
  if (kind === 'tile') return <div className="demo-tile">官方组件</div>
  return null
}

export function ReactBitsMount({ name }: { name: string }) {
  const meta = RB_META[name]
  const [Comp, setComp] = useState<ComponentType<Record<string, unknown>> | null>(null)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    const key = Object.keys(modules).find((k) => k.endsWith(`/${name}.jsx`) || k.endsWith(`/${name}/${name}.jsx`))
    const load = key ? modules[key] : undefined
    if (!load) {
      setErr('component file not found')
      return
    }
    load()
      .then((mod) => {
        if (!alive) return
        const m = mod as { default?: ComponentType<Record<string, unknown>> }
        if (!m.default) throw new Error('default export missing')
        setComp(() => m.default as ComponentType<Record<string, unknown>>)
      })
      .catch((e: Error) => {
        if (alive) setErr(e.message || String(e))
      })
    return () => {
      alive = false
    }
  }, [name])

  if (err) throw new Error(err)
  if (!Comp) return <div className="lazy-placeholder">加载 react-bits…</div>
  const props = { ...(meta?.defaults ?? {}) }
  return <Comp {...props}>{childFor(meta?.childrenKind ?? null)}</Comp>
}
""")
print("three", len(three), "rb", len(meta))
