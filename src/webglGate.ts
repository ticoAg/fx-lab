const MAX = 4
let active = 0
const waiters: Array<() => void> = []

export function acquireWebgl(): Promise<() => void> {
  return new Promise((resolve) => {
    const grant = () => {
      active += 1
      let released = false
      resolve(() => {
        if (released) return
        released = true
        active -= 1
        const next = waiters.shift()
        if (next) next()
      })
    }
    if (active < MAX) grant()
    else waiters.push(grant)
  })
}
