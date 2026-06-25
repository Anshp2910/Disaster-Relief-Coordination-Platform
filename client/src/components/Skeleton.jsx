export function SkeletonLine({ width = '100%', height = 14, style = {}, className = '' }) {
  return <div className={`sk-line ${className}`} style={{ width, height, ...style }} aria-hidden="true" />
}

export function SkeletonCard({ lines = 3, style = {} }) {
  return (
    <div className="sk-card" style={style} aria-hidden="true">
      {Array.from({ length: lines }).map((_, i) => (
        <SkeletonLine key={i} height={i === 0 ? 16 : 12} width={i === lines - 1 ? '60%' : '100%'} className="mb-sm" />
      ))}
    </div>
  )
}

export function SkeletonList({ count = 4, lines = 3 }) {
  return (
    <div className="sk-list" aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} lines={lines} />
      ))}
    </div>
  )
}

export function SkeletonMap({ height = '70vh' }) {
  return (
    <div className="sk-map" style={{ height }} aria-hidden="true" />
  )
}
