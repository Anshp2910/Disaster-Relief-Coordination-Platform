import { useState, useCallback, type ReactNode, type MouseEvent } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import useReducedMotion from '../../hooks/useReducedMotion'

interface RippleBtnProps {
  children: ReactNode
  onClick?: (e: MouseEvent<HTMLButtonElement>) => void
  className?: string
  type?: 'button' | 'submit' | 'reset'
  disabled?: boolean
  'aria-label'?: string
  style?: React.CSSProperties
}

interface Ripple {
  id: number
  x: number
  y: number
  size: number
}

export default function RippleBtn({
  children, onClick, className = '', type = 'button', disabled, 'aria-label': ariaLabel, style,
}: RippleBtnProps) {
  const reduced = useReducedMotion()
  const [ripples, setRipples] = useState<Ripple[]>([])

  const handleClick = useCallback((e: MouseEvent<HTMLButtonElement>) => {
    if (reduced) { onClick?.(e); return }
    const rect = e.currentTarget.getBoundingClientRect()
    const size = Math.max(rect.width, rect.height)
    const x = e.clientX - rect.left - size / 2
    const y = e.clientY - rect.top - size / 2
    const id = Date.now()
    setRipples((prev) => [...prev, { id, x, y, size }])
    setTimeout(() => setRipples((prev) => prev.filter((r) => r.id !== id)), 600)
    onClick?.(e)
  }, [reduced, onClick])

  return (
    <button
      type={type}
      className={`rp-btn ${className}`}
      onClick={handleClick}
      disabled={disabled}
      aria-label={ariaLabel}
      style={{ position: 'relative', overflow: 'hidden', ...style }}
    >
      {children}
      {!reduced && <AnimatePresence>
        {ripples.map((r) => (
          <motion.span
            key={r.id}
            className="rp-ripple"
            initial={{ scale: 0, opacity: 0.5 }}
            animate={{ scale: 3, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            style={{
              position: 'absolute', left: r.x, top: r.y,
              width: r.size, height: r.size,
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.35)',
              pointerEvents: 'none',
            }}
          />
        ))}
      </AnimatePresence>}
    </button>
  )
}
