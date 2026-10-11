import { useEffect, useState } from 'react'
import { loadSvgKit, loadSvgKits, type SvgKitsListResponse } from './client.ts'
import type { SvgKitTheme } from './types.ts'

export function useSvgKits() {
  const [data, setData] = useState<SvgKitsListResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const reload = () => {
    setLoading(true)
    loadSvgKits().then(
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
