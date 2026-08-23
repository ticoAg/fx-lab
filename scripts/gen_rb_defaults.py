import pathlib, re, json
root = pathlib.Path("/workspace/fx-lab/src/react-bits")
ZH = {
  "ASCIIText": "ASCII 文字",
  "AccordionGallery": "手风琴画廊",
  "AcidSquares": "酸性方块",
  "AnimatedContent": "内容入场",
  "AnimatedList": "交错列表",
  "Antigravity": "反重力粒子",
  "Aurora": "极光背景",
  "Balatro": "Balatro 着色",
  "Ballpit": "球池",
  "Beams": "光束",
  "BlobCursor": "液态光标",
  "BlurText": "模糊显现",
  "BorderGlow": "边框辉光",
  "BounceCards": "弹跳卡片",
  "BubbleMenu": "气泡菜单",
  "CardNav": "卡片导航",
  "CardSwap": "卡片交换",
  "Carousel": "轮播",
  "ChromaGrid": "色度网格",
  "CircularGallery": "环形画廊",
  "CircularText": "环形文字",
  "ClickSpark": "点击火花",
  "ColorBends": "色彩弯折",
  "CountUp": "数字递增",
  "Counter": "计数器",
  "Crosshair": "准星光标",
  "Cubes": "立方体簇",
  "CursorGrid": "光标网格",
  "CurvedInput": "弧形输入",
  "CurvedLoop": "曲线循环字",
  "DarkVeil": "暗幕",
  "DecayCard": "消散卡片",
  "DecryptedText": "解密文字",
  "DepthCarousel": "纵深轮播",
  "DepthText": "纵深文字",
  "Dither": "抖动背景",
  "Dock": "程序坞",
  "DomeGallery": "穹顶画廊",
  "DotField": "点阵场",
  "DotGrid": "点阵网格",
  "DriftWall": "漂移墙",
  "EchoText": "回声文字",
  "ElasticMesh": "弹性网格",
  "ElasticSlider": "弹性滑块",
  "ElectricBorder": "电弧边框",
  "EvilEye": "邪眼",
  "FadeContent": "淡入内容",
  "FallingText": "坠落文字",
  "FaultyTerminal": "故障终端",
  "Ferrofluid": "磁流体",
  "FloatingLines": "漂浮线",
  "FlowingMenu": "流动菜单",
  "FluidGlass": "流体玻璃",
  "FlyingPosters": "飞行海报",
  "FoldText": "折纸文字",
  "Folder": "文件夹",
  "FuzzyText": "毛刺文字",
  "Galaxy": "星系",
  "GhostCursor": "幽灵光标",
  "GlareHover": "眩光悬停",
  "GlassIcons": "玻璃图标",
  "GlassSurface": "玻璃表面",
  "GlitchText": "故障文字",
  "GooeyNav": "粘滞导航",
  "GradientBlinds": "渐变百叶",
  "GradientText": "渐变文字",
  "GradientWaves": "渐变波",
  "GradualBlur": "渐进去模糊",
  "Grainient": "颗粒渐变",
  "GridDistortion": "网格畸变",
  "GridMotion": "网格运动",
  "GridScan": "网格扫描",
  "HalftoneReveal": "半调显现",
  "Hyperspeed": "超空间",
  "ImageTrail": "图像拖尾",
  "InfiniteMenu": "无限菜单",
  "Iridescence": "虹彩",
  "Lanyard": "挂绳工牌",
  "LaserFlow": "激光流",
  "LetterGlitch": "字母故障",
  "LightPillar": "光柱",
  "LightRays": "体积光",
  "LightTunnel": "光隧道",
  "Lightfall": "光雨",
  "Lightning": "闪电",
  "LineSidebar": "线型侧栏",
  "LineWaves": "线波",
  "LiquidChrome": "液态铬",
  "LiquidEther": "液态以太",
  "LogoLoop": "标志循环",
  "MagicBento": "魔法便当格",
  "MagicRings": "魔法环",
  "Magnet": "磁力吸附",
  "MagnetLines": "磁力线",
  "MaskedHeading": "蒙版标题",
  "Masonry": "瀑布流",
  "MetaBalls": "融球",
  "MetallicPaint": "金属油漆",
  "ModelViewer": "模型查看器",
  "MoltenMetal": "熔金",
  "MorphSlider": "熔变滑块",
  "Noise": "胶片噪点",
  "OptionWheel": "选项轮",
  "Orb": "能量球",
  "OrbitImages": "轨道图像",
  "ParticleText": "粒子文字",
  "Particles": "粒子场",
  "PillNav": "胶囊导航",
  "PixelBlast": "像素爆破",
  "PixelCard": "像素卡片",
  "PixelSnow": "像素雪",
  "PixelSwap": "像素交换",
  "PixelTrail": "像素拖尾",
  "PixelTransition": "像素过渡",
  "Plasma": "等离子",
  "PlasmaWave": "等离子波",
  "Prism": "棱镜",
  "PrismaticBurst": "棱镜爆发",
  "ProfileCard": "资料卡",
  "Radar": "雷达",
  "ReflectiveCard": "反射卡片",
  "Ribbons": "缎带",
  "RippleDistortion": "涟漪畸变",
  "RippleGrid": "涟漪网格",
  "RotatingText": "旋转文字",
  "Scanner": "扫描带",
  "ScrambledText": "扰动文字",
  "ScrollExpand": "滚动扩展",
  "ScrollFloat": "滚动漂浮",
  "ScrollReveal": "滚动显现",
  "ScrollStack": "滚动堆叠",
  "ScrollVelocity": "滚动速度字",
  "ShapeBlur": "形状模糊",
  "ShapeGrid": "形状网格",
  "ShinyText": "金属扫光字",
  "Shuffle": "洗牌文字",
  "SideRays": "侧向光",
  "Silk": "丝绸",
  "SlicedWaves": "切片波",
  "SoftAurora": "柔和极光",
  "SpecularButton": "高光按钮",
  "SplashCursor": "飞溅光标",
  "SplitFlapText": "翻牌文字",
  "SplitText": "拆分文字",
  "SpotlightCard": "聚光卡片",
  "Stack": "层叠卡片",
  "StaggeredMenu": "交错菜单",
  "StarBorder": "星光边框",
  "Stepper": "步骤条",
  "StickerPeel": "贴纸揭起",
  "Strands": "光丝",
  "StrokeText": "描边文字",
  "SwarmCursor": "蜂群光标",
  "TargetCursor": "锁定光标",
  "TextCursor": "文字光标",
  "TextLoop": "文字循环",
  "TextPressure": "压力文字",
  "TextType": "打字机",
  "Threads": "织线",
  "TiltedCard": "倾斜卡片",
  "Topography": "等高线",
  "TrueFocus": "真焦点",
  "VariableProximity": "近距变体字",
  "WarpText": "扭曲文字",
  "Waves": "波浪线",
  "WebThreads": "蛛网丝",
}
WEBGL_HINTS = ("three", "ogl", "@react-three", "WebGL", "webgl")
CHILD_WRAPPERS = {
  "AnimatedContent","ClickSpark","Crosshair","ElectricBorder","FadeContent",
  "GlareHover","GradualBlur","Magnet","PixelTransition","StarBorder",
  "StickerPeel","TargetCursor","BorderGlow","DecayCard","Folder",
  "GlassSurface","HalftoneReveal","PixelCard","PixelSwap","RippleDistortion",
  "ScrollExpand","SpecularButton","SpotlightCard","TiltedCard","ReflectiveCard",
  "GradientText","ElasticSlider",
}
TEXT_COMPONENTS = {
  "ASCIIText","BlurText","CircularText","CountUp","CurvedLoop","DecryptedText",
  "DepthText","EchoText","FallingText","FoldText","FuzzyText","GlitchText",
  "GradientText","MaskedHeading","ParticleText","RotatingText","ScrambledText",
  "ScrollFloat","ScrollReveal","ScrollVelocity","ShinyText","Shuffle",
  "SplitFlapText","SplitText","StrokeText","TextCursor","TextLoop","TextPressure",
  "TextType","TrueFocus","VariableProximity","WarpText",
}

items = []
for folder in sorted(p for p in root.iterdir() if p.is_dir()):
    name = folder.name
    jsx = folder / f"{name}.jsx"
    if not jsx.exists():
        jsxs = list(folder.glob("*.jsx"))
        if not jsxs:
            continue
        jsx = jsxs[0]
    text = jsx.read_text(errors="replace")
    webgl = any(h in text for h in WEBGL_HINTS)
    props = []
    m = re.search(r"(?:function|const|export default function)\s+\w+\s*=?\s*\(\s*\{([^}]{0,800})", text)
    if m:
        raw = m.group(1)
        for part in raw.split(","):
            part = part.strip()
            if not part or part.startswith("..."):
                continue
            key = re.split(r"\s*[=:]", part, 1)[0].strip()
            if re.match(r"^[A-Za-z_]\w*$", key):
                props.append(key)
    defaults = {}
    children_kind = None
    zh = ZH.get(name, name)
    if "text" in props:
        defaults["text"] = zh
    if "texts" in props:
        defaults["texts"] = [zh, "运动实验室", "官方组件"]
    if "title" in props and "text" not in props:
        defaults["title"] = zh
    if "label" in props:
        defaults["label"] = zh
    if "heading" in props:
        defaults["heading"] = zh
    if "to" in props and name in ("CountUp", "Counter"):
        defaults["to"] = 2026
        defaults["from"] = 0
    if "from" in props and name == "CountUp":
        defaults["from"] = 0
    if "items" in props:
        defaults["items"] = [f"{zh} {i}" for i in range(1, 5)]
    if "words" in props:
        defaults["words"] = ["运动", "实验室", "官方", "组件"]
    if name in CHILD_WRAPPERS or ("children" in props and name not in TEXT_COMPONENTS):
        children_kind = "tile"
    if name == "GradientText":
        children_kind = "text"
        defaults = {k: v for k, v in defaults.items() if k != "text"}
    if name == "ClickSpark":
        children_kind = "tile"
    if name == "Magnet":
        children_kind = "button"
    if name in ("Aurora","Silk","Plasma","Beams","Waves","Particles","Threads","Galaxy"):
        defaults.setdefault("color", "#6366f1")
    items.append({
        "id": f"rb-{name}",
        "name": name,
        "zh": zh,
        "importPath": f"../react-bits/{name}/{name}.jsx",
        "webgl": webgl,
        "defaults": defaults,
        "childrenKind": children_kind,
        "props": props[:20],
    })

out = pathlib.Path("/workspace/fx-lab/scripts/rb-meta.json")
out.write_text(json.dumps(items, ensure_ascii=False, indent=2))
print("items", len(items), "webgl", sum(1 for i in items if i["webgl"]))
