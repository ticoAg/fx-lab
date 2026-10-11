import { useEffect, useState } from 'react'

const cache = new Map<string, Promise<string>>()

export function loadSvgSource(url: string) {
  let p = cache.get(url)
  if (!p) {
    p = fetch(url).then((r) => {
      if (!r.ok) throw new Error(`${r.status} ${url}`)
      return r.text()
    })
    p.catch(() => cache.delete(url))
    cache.set(url, p)
  }
  return p
}

export function useSvgSource(url: string | null) {
  const [state, setState] = useState<{ url: string | null; text: string | null; error: string | null }>({
    url: null,
    text: null,
    error: null,
  })
  useEffect(() => {
    if (!url) return
    let alive = true
    loadSvgSource(url).then(
      (text) => alive && setState({ url, text, error: null }),
      (e: unknown) => alive && setState({ url, text: null, error: String(e) }),
    )
    return () => {
      alive = false
    }
  }, [url])
  return state.url === url ? state : { url, text: null, error: null }
}
