import { useEffect, useRef, useState } from 'react'

export function useCountUp(target: number, duration = 560) {
  const [value, setValue] = useState(target)
  const currentRef = useRef(target)

  useEffect(() => {
    const from = currentRef.current
    const instant = from === target || window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const start = performance.now()
    let frame = 0
    const tick = (now: number) => {
      const t = instant ? 1 : Math.min(1, (now - start) / duration)
      const eased = 1 - Math.pow(1 - t, 3)
      const next = Math.round(from + (target - from) * eased)
      currentRef.current = next
      setValue(next)
      if (t < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [target, duration])

  return value
}
