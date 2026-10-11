// Contact sheet on light and dark bands, animations frozen at t=0.
// Usage: node sheet.mjs <themeDir> <out.png> [cell=130] [id,id,...]
// cell >= 250 lays out 4 per row for detail review; smaller cells use 8 per row.
// INK=#e5484d paints currentColor in a loud color on both bands: everything that turns red follows the
// page stroke picker, everything else is fixed. Use it to catch accidental currentColor fills and missing outlines.
import fs from 'node:fs/promises'
import { launch, shadowHost } from './browser.mjs'

const [dir, out, cellArg, filter] = process.argv.slice(2)
if (!dir || !out) throw new Error('usage: node sheet.mjs <themeDir> <out.png> [cell] [ids]')
const cell = Number(cellArg || 130)
const theme = JSON.parse(await fs.readFile(`${dir}/manifest.json`, 'utf8'))
const icons = filter ? theme.icons.filter(i => filter.split(',').includes(i.id)) : theme.icons
const cols = Math.min(cell >= 250 ? 4 : 8, icons.length)
const tiles = await Promise.all(icons.map(async i => ({ id: i.id, svg: shadowHost(await fs.readFile(`${dir}/icons/${i.id}.svg`, 'utf8')) })))

const browser = await launch()
const page = await browser.newPage({ viewport: { width: cols * (cell + 12) + 24, height: 100 } })
const errors = []
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()) })
page.on('pageerror', e => errors.push(String(e)))
await page.setContent(`<style>body{margin:0;font:11px -apple-system,sans-serif}
.band{display:grid;grid-template-columns:repeat(${cols},${cell}px);gap:12px;padding:12px}
.light{background:#f4efe4;color:${process.env.INK || '#1c1d24'}}.dark{background:#1c1d24;color:${process.env.INK || '#ece6d8'}}
.h{display:block;width:${cell}px;height:${cell}px}.l{opacity:.6;text-align:center;margin-top:2px}</style>
<div class="band light" id="a"></div><div class="band dark" id="b"></div>`)
await page.evaluate(tiles => {
  for (const band of ['a', 'b']) for (const t of tiles) {
    const d = document.createElement('div')
    const h = document.createElement('span'); h.className = 'h'
    h.attachShadow({ mode: 'open' }).innerHTML = t.svg
    const l = document.createElement('div'); l.className = 'l'; l.textContent = t.id
    d.append(h, l); document.getElementById(band).append(d)
  }
  document.querySelectorAll('.h').forEach(h => h.shadowRoot.querySelector('svg').getAnimations({ subtree: true })
    .forEach(a => { a.pause(); a.currentTime = 0 }))
}, tiles)
await page.screenshot({ path: out, fullPage: true })
await browser.close()
if (errors.length) { console.error(errors.join('\n')); process.exit(1) }
console.log(`wrote ${out} (${icons.length} icons)`)
