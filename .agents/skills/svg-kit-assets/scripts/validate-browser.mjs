// Browser acceptance for one theme directory (manifest.json + icons/).
// Usage: node validate-browser.mjs <themeDir> [reportDir]
// Checks per icon: exactly one animation (none for animation "none"), host pause/resume through
// animation-play-state inheritance, reduced motion, transparent margin >= 3 viewBox units at 8
// phases, and light/dark renders at 80 and 320. Fails on console errors or any http(s) request.
import fs from 'node:fs/promises'
import assert from 'node:assert/strict'
import { pathToFileURL } from 'node:url'
import { launch, shadowHost } from './browser.mjs'

const [dir, reportDir = `${process.argv[2]}/../.validate`] = process.argv.slice(2)
if (!dir) throw new Error('usage: node validate-browser.mjs <themeDir> [reportDir]')
await fs.mkdir(`${reportDir}/renders`, { recursive: true })
const theme = JSON.parse(await fs.readFile(`${dir}/manifest.json`, 'utf8'))
const MIN_MARGIN = 3
const phases = [0, 0.125, 0.25, 0.375, 0.5, 0.625, 0.75, 0.875]

const browser = await launch()
const context = await browser.newContext({ viewport: { width: 384, height: 384 }, reducedMotion: 'no-preference' })
const page = await context.newPage()
const errors = []
const external = []
page.on('pageerror', e => errors.push(String(e)))
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()) })
context.on('request', r => { if (/^https?:/.test(r.url())) external.push(r.url()) })
await context.route(/^https?:/, r => r.abort())

// Alpha bounding box of a transparent screenshot, measured in the page.
async function margins(png) {
  return page.evaluate(async b64 => {
    const img = new Image()
    img.src = `data:image/png;base64,${b64}`
    await img.decode()
    const c = Object.assign(document.createElement('canvas'), { width: img.width, height: img.height })
    const g = c.getContext('2d')
    g.drawImage(img, 0, 0)
    const { data } = g.getImageData(0, 0, c.width, c.height)
    let l = c.width, t = c.height, r = -1, b = -1
    for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) {
      if (data[(y * c.width + x) * 4 + 3] > 8) { l = Math.min(l, x); r = Math.max(r, x + 1); t = Math.min(t, y); b = Math.max(b, y + 1) }
    }
    return r < 0 ? null : [(l - 32) / 4, (t - 32) / 4, (352 - r) / 4, (352 - b) / 4]
  }, png.toString('base64'))
}

const report = { browser: await browser.version(), icons: [], errors, external }
try {
  for (const icon of theme.icons) {
    const svg = await fs.readFile(`${dir}/icons/${icon.id}.svg`, 'utf8')
    const animated = icon.animation !== 'none'
    await page.setViewportSize({ width: 384, height: 384 })
    await page.goto('about:blank')
    await page.setContent('<style>html,body{margin:0;background:transparent}#stage{display:block;width:320px;height:320px;margin:32px;color:#1c1d24}</style><span id="stage"></span>')
    await page.evaluate(markup => { document.querySelector('#stage').attachShadow({ mode: 'open' }).innerHTML = markup }, shadowHost(svg))
    const host = await page.evaluate(async () => {
      const el = document.querySelector('#stage')
      const anims = () => el.shadowRoot.querySelector('svg').getAnimations({ subtree: true })
      const frame = () => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))
      const s = { count: anims().length }
      if (!s.count) return s
      await frame()
      s.running = anims().every(a => a.playState === 'running')
      el.style.animationPlayState = 'paused'
      await frame()
      s.paused = anims().every(a => a.playState === 'paused')
      const t = anims().map(a => a.currentTime)
      await new Promise(r => setTimeout(r, 120))
      s.stopped = anims().every((a, i) => Math.abs(a.currentTime - t[i]) < 0.1)
      el.style.animationPlayState = 'running'
      await frame()
      const t2 = anims().map(a => a.currentTime)
      await new Promise(r => setTimeout(r, 120))
      s.resumed = anims().every((a, i) => a.playState === 'running' && a.currentTime > t2[i] + 30)
      return s
    })
    assert.equal(host.count, animated ? 1 : 0, `${icon.id}: expected ${animated ? 1 : 0} animation, got ${host.count}`)
    if (animated) assert(host.running && host.paused && host.stopped && host.resumed, `${icon.id}: host pause/resume ${JSON.stringify(host)}`)

    let min = Infinity
    let worst = null
    for (const phase of animated ? phases : [0]) {
      await page.evaluate(p => {
        document.querySelector('#stage').shadowRoot.querySelector('svg').getAnimations({ subtree: true }).forEach(a => {
          a.pause()
          a.currentTime = a.effect.getTiming().duration * p
        })
      }, phase)
      const m = await margins(await page.screenshot({ omitBackground: true }))
      assert(m, `${icon.id}: renders nothing`)
      const low = Math.min(...m)
      if (low < min) { min = low; worst = { phase, edges: m } }
    }
    assert(min >= MIN_MARGIN, `${icon.id}: margin ${min} < ${MIN_MARGIN} at ${JSON.stringify(worst)} (edges: left, top, right, bottom)`)

    await page.emulateMedia({ reducedMotion: 'reduce' })
    const reduced = await page.evaluate(() => {
      const s = document.querySelector('#stage').shadowRoot.querySelector('svg')
      const motion = s.querySelector('[class$="-motion"]')
      return { count: s.getAnimations({ subtree: true }).length, transform: motion ? getComputedStyle(motion).transform : 'none' }
    })
    assert.equal(reduced.count, 0, `${icon.id}: still animates under reduced motion`)
    assert.equal(reduced.transform, 'none', `${icon.id}: transform left on under reduced motion`)
    await page.emulateMedia({ reducedMotion: 'no-preference' })

    for (const size of [80, 320]) {
      await page.setViewportSize({ width: size, height: size })
      await page.goto(pathToFileURL(`${dir}/icons/${icon.id}.svg`).href)
      for (const [mode, bg, color] of [['light', '#f4efe4', '#1c1d24'], ['dark', '#1c1d24', '#ece6d8']]) {
        await page.evaluate(({ size, bg, color }) => {
          const s = document.documentElement
          s.setAttribute('width', size)
          s.setAttribute('height', size)
          s.style.cssText = `width:${size}px;height:${size}px;display:block;background:${bg};color:${color}`
          document.getAnimations().forEach(a => { a.pause(); a.currentTime = 0 })
        }, { size, bg, color })
        await page.screenshot({ path: `${reportDir}/renders/${icon.id}-${mode}-${size}.png` })
      }
    }
    report.icons.push({ id: icon.id, animation: icon.animation, host, minMargin: min })
  }
  assert.equal(errors.length, 0, `console errors:\n${errors.join('\n')}`)
  assert.equal(external.length, 0, `external requests:\n${external.join('\n')}`)
  report.passed = true
  const m = report.icons.reduce((a, b) => (a.minMargin <= b.minMargin ? a : b))
  console.log(`PASS ${theme.id}: ${report.icons.length} icons in Chrome ${report.browser}; min margin ${m.minMargin} (${m.id}); 0 errors, 0 external requests`)
} catch (e) {
  report.passed = false
  report.failure = String(e)
  console.error(`FAIL ${e.message}`)
  process.exitCode = 1
} finally {
  await fs.writeFile(`${reportDir}/browser-report.json`, JSON.stringify(report, null, 2) + '\n')
  await browser.close()
}
