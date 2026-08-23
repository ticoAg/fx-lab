import { createRequire } from 'node:module'
const names = [
"AmberHalftone","AnimatedTopDock","AudioWordmark","BallStudy","BellFieldBackground","BestsellersBookShowcase","BookshelfScene","BrandOrbs","CharacterCarousel","CharacterFilmstrip","CharacterWave","CircleButtons","ClothStudy","CloudField","CompleteShelfLandingPage","CondensationBackground","ConnectivityGraph","ConstellationField","CrtBackground","DataField","DefenseLines","DiagnosticsPanel","DimensionalField","DotBorderButton","DotMatrixBackground","ElementsBackground","ElementsCollection","EmberStorm","EmeraldHorizonBackground","EngravedCertificate","ExpanseField","FloatingDotsCta","FlowField","FluidFieldBackground","FluxVortex","Gallery","GalleryHeading","GatewayFlow","GenerateButton","GenerativeTree","GlassmorphismCta","GlobeCollection","GradientBeamCta","GradientCta","GradientPillButton","HalftoneFlow","IgnitionButton","InductionButton","InterfaceLines","JapaneseTowerLandscape","KageLandingPage","KoiStudies","LandscapeScene","LaserCollection","LaunchButton","LiquidFormBackground","LiquidMetalButton","LogicCoreField","LumenCta","MengToSketchbookLandingPage","MorphingGlyphCloud","NebulaBackground","NeonTypography","OrbitalSphereBackground","OutlineTypeflow","ParticleDrift","ParticleNetwork","ParticleWordmark","PerformanceGauges","PlasmaButton","PortalFieldCollection","PredictiveArcCanvas","RectangleButtons","RibbonFieldBackground","RippleStudy","SemanticBloom","ShaderButtons","Sketchbook","SkeuomorphicToggle","SlidingTextCta","SparkBadge","SpinningBorderButton","StreamConvergenceBackground","StructureFlowCollection","SylvaHero","SylvaLivingWorldScene","TactileButton","TempleNightScene","TextAnimationCollection","TextPathStudies","ThinkingButton","ThreeUIIntro","TopoField","TopologyField","TypographyVortexCanvas","UplinkLoader","VoidField","WarpFieldBackground","WireframeForms","WovenCloth"
]
const ok = []
const fail = []
for (const name of names) {
  try {
    const mod = await import(`@designcodeio/threeui/components/${name}`)
    if (!mod[name]) throw new Error('named export missing: ' + Object.keys(mod).join(','))
    ok.push(name)
  } catch (e) {
    fail.push(name + ': ' + (e && e.message ? e.message : e))
  }
}
console.log('import_ok', ok.length)
console.log('import_fail', fail.length)
for (const f of fail) console.log('FAIL', f)
