import type { IncomingMessage, ServerResponse } from 'node:http'
import { resolve } from 'node:path'
import type { Connect, Plugin, PreviewServer, ViteDevServer } from 'vite'
import { handleSvgKitsRequest } from './functions/_lib/http.ts'
import { copySeedToDist, readSeedPublicFile, SeedDirStore, seedLocalStore } from './scripts/lib/svg-kits-fs-store.ts'

function rootDirs(root: string) {
  return {
    seedRoot: resolve(root, 'seed/svg-kits'),
    dataRoot: resolve(root, '.data/svg-kits'),
  }
}

function readBody(req: IncomingMessage) {
  return new Promise<Buffer>((resolveBody, reject) => {
    const chunks: Buffer[] = []
    req.on('data', (chunk) => chunks.push(chunk as Buffer))
    req.on('end', () => resolveBody(Buffer.concat(chunks)))
    req.on('error', reject)
  })
}

async function toFetchRequest(req: IncomingMessage) {
  const host = req.headers.host || '127.0.0.1'
  const url = `http://${host}${req.url}`
  const headers = new Headers()
  for (const [key, value] of Object.entries(req.headers)) {
    if (value == null) continue
    if (Array.isArray(value)) {
      for (const item of value) headers.append(key, item)
    } else {
      headers.set(key, value)
    }
  }
  const method = req.method || 'GET'
  if (method === 'GET' || method === 'HEAD') return new Request(url, { method, headers })
  const body = await readBody(req)
  return new Request(url, { method, headers, body: new Blob([new Uint8Array(body)]) })
}

async function send(res: ServerResponse, response: Response) {
  res.statusCode = response.status
  response.headers.forEach((value, key) => {
    res.setHeader(key, value)
  })
  res.end(Buffer.from(await response.arrayBuffer()))
}

function apiMiddleware(projectRoot: string): Connect.NextHandleFunction {
  const { seedRoot, dataRoot } = rootDirs(projectRoot)
  const seed = new SeedDirStore(seedRoot)
  const local = seedLocalStore(seedRoot, dataRoot)
  const adminToken = process.env.SVG_KITS_ADMIN_TOKEN || 'dev'

  return async (req, res, next) => {
    const url = req.url?.split('?')[0] ?? ''
    try {
      if (url.startsWith('/seed-svg-kits/')) {
        const file = readSeedPublicFile(seedRoot, url)
        if (!file) {
          res.statusCode = 404
          res.end('not found')
          return
        }
        res.setHeader('content-type', file.contentType)
        res.end(file.body)
        return
      }
      if (!url.startsWith('/api/svg-kits')) {
        next()
        return
      }
      const request = await toFetchRequest(req)
      const response = await handleSvgKitsRequest(request, local, seed, {
        adminToken,
        views: local,
        setupHint: 'Local store is .data/svg-kits. Production needs an R2 bucket bound as SVG_KITS plus SVG_KITS_ADMIN_TOKEN.',
      })
      await send(res, response)
    } catch (err) {
      if (res.writableEnded) return
      res.statusCode = 500
      res.setHeader('content-type', 'application/json; charset=utf-8')
      res.end(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }))
    }
  }
}

function attach(server: ViteDevServer | PreviewServer, projectRoot: string) {
  server.middlewares.use(apiMiddleware(projectRoot))
}

export function svgKitsApiPlugin(): Plugin {
  let projectRoot = process.cwd()
  return {
    name: 'svg-kits-api',
    configResolved(config) {
      projectRoot = config.root
    },
    configureServer(server) {
      attach(server, projectRoot)
    },
    configurePreviewServer(server) {
      attach(server, projectRoot)
    },
    writeBundle(options) {
      const outDir = options.dir || resolve(projectRoot, 'dist')
      copySeedToDist(resolve(projectRoot, 'seed/svg-kits'), outDir)
    },
  }
}
