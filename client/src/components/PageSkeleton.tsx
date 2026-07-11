import { motion } from 'framer-motion'
import { createStagger, createListItem } from '../utils/animations'

const containerVariants = createStagger(0.06, 0.08)
const itemVariants = createListItem(10, 0.35)

function SkeletonBlock({ className = '' }: { className?: string }) {
  return (
    <motion.div variants={itemVariants} className={className}>
      <div className="sk-card">
        <div className="sk-line" style={{ width: '40%', height: 16 }} />
        <div className="sk-line" style={{ width: '100%', height: 12 }} />
        <div className="sk-line" style={{ width: '80%', height: 12 }} />
        <div className="sk-line" style={{ width: '55%', height: 12 }} />
      </div>
    </motion.div>
  )
}

function SkeletonHeader() {
  return (
    <motion.div variants={itemVariants} className="flex-between mb-md mt-md">
      <div>
        <div className="sk-line" style={{ width: 220, height: 24, marginBottom: 8 }} />
        <div className="sk-line" style={{ width: 140, height: 12 }} />
      </div>
      <div className="flex gap-sm">
        <div className="sk-line" style={{ width: 90, height: 36, borderRadius: 'var(--radius-xs)' }} />
        <div className="sk-line" style={{ width: 120, height: 36, borderRadius: 'var(--radius-xs)' }} />
      </div>
    </motion.div>
  )
}

function SkeletonFilters() {
  return (
    <motion.div variants={itemVariants} className="flex gap-sm flex-wrap mb-sm">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="sk-line" style={{ width: 70 + i * 8, height: 32, borderRadius: 'var(--radius-full)' }} />
      ))}
    </motion.div>
  )
}

function SkeletonCardGrid({ count = 4 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonBlock key={i} />
      ))}
    </>
  )
}

export function PageSkeleton({ type = 'default' }: { type?: 'default' | 'table' | 'detail' | 'map' }) {
  if (type === 'detail') {
    return (
      <div className="container">
        <motion.div
          className="mt-md"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <SkeletonHeader />
          <motion.div variants={itemVariants}>
            <div className="card">
              <div className="flex gap-md">
                <div style={{ flex: 1 }}>
                  <div className="sk-line" style={{ width: '60%', height: 20, marginBottom: 12 }} />
                  <div className="sk-line" style={{ width: '100%', height: 12 }} />
                  <div className="sk-line" style={{ width: '100%', height: 12 }} />
                  <div className="sk-line" style={{ width: '75%', height: 12 }} />
                  <div className="sk-line" style={{ width: '100%', height: 12 }} />
                  <div className="sk-line" style={{ width: '50%', height: 12 }} />
                </div>
                <div className="sk-line" style={{ width: 160, height: 160, borderRadius: 'var(--radius-sm)', flexShrink: 0 }} />
              </div>
            </div>
          </motion.div>
          <SkeletonBlock />
        </motion.div>
      </div>
    )
  }

  if (type === 'table') {
    return (
      <div className="container">
        <motion.div
          className="mt-md"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <SkeletonHeader />
          <motion.div variants={itemVariants}>
            <div className="card">
              {[1, 2, 3, 4, 5].map((row) => (
                <div key={row} className="flex gap-sm items-center mb-sm" style={{ padding: 'var(--space-xs) 0' }}>
                  <div className="sk-line" style={{ width: '30%', height: 14 }} />
                  <div className="sk-line" style={{ width: '15%', height: 14 }} />
                  <div className="sk-line" style={{ width: '20%', height: 14 }} />
                  <div className="sk-line" style={{ width: '25%', height: 14 }} />
                  <div className="sk-line" style={{ width: 60, height: 28, borderRadius: 'var(--radius-2xs)' }} />
                </div>
              ))}
            </div>
          </motion.div>
        </motion.div>
      </div>
    )
  }

  if (type === 'map') {
    return (
      <div className="container">
        <motion.div
          className="mt-md"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <SkeletonHeader />
          <motion.div variants={itemVariants}>
            <div className="sk-map" style={{ height: '60vh', borderRadius: 'var(--radius-sm)' }} />
          </motion.div>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="container">
      <motion.div
        className="mt-md"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <SkeletonHeader />
        <SkeletonFilters />
        <SkeletonCardGrid count={4} />
      </motion.div>
    </div>
  )
}
