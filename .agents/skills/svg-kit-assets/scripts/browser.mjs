// Shared headless Chrome launcher for the svg-kit-assets scripts.
// Uses the system Chrome and a playwright-core install outside the repo:
//   npm i --prefix /tmp/fx-lab-pw playwright-core --no-audit --no-fund
import fs from 'node:fs/promises'

const moduleUrl = process.env.PLAYWRIGHT_MODULE || '/tmp/fx-lab-pw/node_modules/playwright-core/index.mjs'
const chrome = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'

export async function launch() {
  const { chromium } = await import(moduleUrl).catch(() => {
    throw new Error(`playwright-core not found at ${moduleUrl}. Run: npm i --prefix /tmp/fx-lab-pw playwright-core --no-audit --no-fund`)
  })
  process.env.TMPDIR = '/tmp/fx-lab-pw/tmp'
  await fs.mkdir(process.env.TMPDIR, { recursive: true })
  return chromium.launch({ executablePath: chrome, headless: true, args: ['--no-first-run', '--disable-background-networking', '--no-proxy-server'] })
}

export function shadowHost(svg) {
  return `<style>:host{display:block;color:inherit;animation-play-state:inherit}:host>svg{width:100%;height:100%;overflow:visible}</style>${svg}`
}
