import { motion } from 'framer-motion'

type IconState = 'idle' | 'active' | 'complete'

interface MorphPath {
  idle: string
  active: string
  complete: string
}

const MORPH_PATHS: Record<string, MorphPath> = {
  clipboard: {
    idle: 'M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2',
    active: 'M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2m4 0a2 2 0 00-4 0m4 0a2 2 0 01-4 0m4 0h-4m4 0a2 2 0 014 0m0 0h4M9 14l2 2 4-4',
    complete: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4',
  },
  alert: {
    idle: 'M12 2l10 17H2L12 2z',
    active: 'M12 2l10 17H2L12 2zm0 4v4m0 4h.01',
    complete: 'M12 2l10 17H2L12 2zm-2 13l2 2 4-4',
  },
  check: {
    idle: 'M22 11.08V12a10 10 0 11-5.93-9.14',
    active: 'M22 11.08V12a10 10 0 11-5.93-9.14M8 12l2 2 4-4',
    complete: 'M22 11.08V12a10 10 0 11-5.93-9.14M9 12l2 2 4-4m3-6l2 2',
  },
}

interface AnimatedIconProps {
  name: keyof typeof MORPH_PATHS
  state?: IconState
  size?: number
  className?: string
}

export default function AnimatedIcon({ name, state = 'idle', size = 24, className = '' }: AnimatedIconProps) {
  const paths = MORPH_PATHS[name]
  if (!paths) return null

  const currentPath = paths[state]

  return (
    <motion.svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`morph-icon ${className}`}
      animate={{ rotate: state === 'active' ? [0, -5, 5, 0] : 0 }}
      transition={{ duration: 0.4 }}
      aria-hidden="true"
    >
      <motion.path
        d={currentPath}
        animate={{ d: currentPath }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      />
    </motion.svg>
  )
}
