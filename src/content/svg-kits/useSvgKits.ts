import { useEffect, useState } from 'react'
import { loadSvgKit, loadSvgKits, recordSvgKitView, type SvgKitsListResponse } from './client.ts'
import type { SvgKitTheme } from './types.ts'

// fresh: read from the API instead of the day-long CDN cache (admin page).
export function useSvgKits({ fresh = false }: { fresh?: boolean } = {}) {
  const [data, setData] = useState<SvgKitsListResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const reload = () => {
    setLoading(true)
    loadSvgKits({ fresh }).then(
      (next) => {
        setData(next)
        setError(null)
        setLoading(false)
      },
      (err: unknown) => {
        setError(err instanceof Error ? err.message : String(err))
        setLoading(false)
      },
    )
  }

  useEffect(() => {
    reload()
  }, [])

  return { data, error, loading, reload }
}

export function useSvgKit(id: string | undefined) {
  const [theme, setTheme] = useState<SvgKitTheme | null | undefined>(undefined)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) {
      setTheme(null)
      return
    }
    let alive = true
    setTheme(undefined)
    loadSvgKit(id).then(
      (next) => {
        if (alive) {
          setTheme(next)
          setError(null)
          if (next) void recordSvgKitView(id).catch(() => { /* Statistics must not interrupt browsing. */ })
        }
      },
      (err: unknown) => {
        if (alive) {
          setTheme(null)
          setError(err instanceof Error ? err.message : String(err))
        }
      },
    )
    return () => {
      alive = false
    }
  }, [id])

  return { theme, error }
}
