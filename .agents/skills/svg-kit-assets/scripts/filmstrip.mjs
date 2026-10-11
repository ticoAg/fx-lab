// Frame strip of each icon's animation (8 phases, left to right) to judge motion by eye.
// Usage: node filmstrip.mjs <themeDir> <out.png> [cell=120] [id,id,...]
// A dashed square marks the 3-unit safe margin; anything crossing it fails validate-browser.
import fs from 'node:fs/promises'
import { launch, shadowHost } from './browser.mjs'

const [dir, out, cellArg, filter] = process.argv.slice(2)
if (!dir || !out) throw new Error('usage: node filmstrip.mjs <themeDir> <out.png> [cell] [ids]')
const cell = Number(cellArg || 120)
const phases = [0, 0.125, 0.25, 0.375, 0.5, 0.625, 0.75, 0.875]
const theme = JSON.parse(await fs.readFile(`${dir}/manifest.json`, 'utf8'))
const icons = (filter ? theme.icons.filter(i => filter.split(',').includes(i.id)) : theme.icons).filter(i => i.animation !== 'none')
const rows = await Promise.all(icons.map(async i => ({ id: i.id, animation: i.animation, svg: shadowHost(await fs.readFile(`${dir}/icons/${i.id}.svg`, 'utf8')) })))
const inset = (3 / 80) * cell

const browser = await launch()
const page = await browser.newPage({ viewport: { width: 140 + phases.length * (cell + 8) + 16, height: 100 } })
await page.setContent(`<style>body{margin:0;padding:8px;background:#f4efe4;color:#1c1d24;font:11px -apple-system,sans-serif}
.r{display:flex;align-items:center;gap:8px;margin-bottom:8px}.n{width:132px;opacity:.7}
.c{position:relative;width:${cell}px;height:${cell}px;background:#fff8}
.c::after{content:'';position:absolute;inset:${inset}px;border:1px dashed #e5484d88;pointer-events:none}
.h{display:block;width:100%;height:100%}</style><div id="s"></div>`)
await page.evaluate(({ rows, phases }) => {
  for (const r of rows) {
    const row = document.createElement('div'); row.className = 'r'
    const n = document.createElement('div'); n.className = 'n'; n.textContent = `${r.id} · ${r.animation}`
    row.append(n)
    for (const p of phases) {
      const c = document.createElement('div'); c.className = 'c'
      const h = document.createElement('span'); h.className = 'h'
      h.attachShadow({ mode: 'open' }).innerHTML = r.svg
      c.append(h); row.append(c)
      h.shadowRoot.querySelector('svg').getAnimations({ subtree: true }).forEach(a => {
        a.pause(); a.currentTime = a.effect.getTiming().duration * p
      })
    }
    document.getElementById('s').append(row)
  }
}, { rows, phases })
await page.screenshot({ path: out, fullPage: true })
await browser.close()
console.log(`wrote ${out} (${rows.length} animated icons × ${phases.length} phases)`)
