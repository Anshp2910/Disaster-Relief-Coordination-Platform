import { memo, useEffect, useRef, useState } from 'react'
import { motion, useInView } from 'framer-motion'
import useReducedMotion from '../../hooks/useReducedMotion'

interface AnimatedCounterProps {
  from?: number
  to: number
  duration?: number
  suffix?: string
  prefix?: string
  decimals?: number
  formatter?: (value: number) => string
}

const AnimatedCounter = memo(function AnimatedCounter({
  from = 0, to, duration = 1.5, suffix = '', prefix = '', decimals = 0, formatter,
}: AnimatedCounterProps) {
  const reduced = useReducedMotion()
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true })
  const [displayed, setDisplayed] = useState(from)
  const rafRef = useRef<number>()

  useEffect(() => {
    if (!inView) return
    if (reduced) { setDisplayed(to); return }
    const startTime = performance.now()
    const range = to - from

    function tick(now: number) {
      const elapsed = (now - startTime) / 1000
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplayed(from + range * eased)
      if (progress < 1) rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [inView, from, to, duration, reduced])

  const final = reduced ? to : displayed
  const formatted = formatter
    ? formatter(final)
    : final.toFixed(decimals)

  return (
    <motion.span
      ref={ref}
      initial={reduced ? {} : { opacity: 0, y: 8 }}
      animate={reduced ? {} : (inView ? { opacity: 1, y: 0 } : {})}
      transition={reduced ? { duration: 0 } : { duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
    >
      {prefix}{formatted}{suffix}
    </motion.span>
  )
})

export default AnimatedCounter
