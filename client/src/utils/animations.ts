import { type Variants } from 'framer-motion'

const ease = [0.16, 1, 0.3, 1] as const

export function createStagger(delay: number = 0.06, childrenDelay: number = 0.05): Variants {
  return {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: delay, delayChildren: childrenDelay },
    },
  }
}

export function createListItem(yOffset: number = 12, duration: number = 0.3, scale: number = 0.98): Variants {
  return {
    hidden: { opacity: 0, y: yOffset, scale },
    visible: { opacity: 1, y: 0, scale: 1, transition: { duration, ease } },
  }
}
