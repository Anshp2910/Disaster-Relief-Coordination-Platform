import { SkeletonCard } from './Skeleton'

export function PageSkeleton() {
  return (
    <div className="container">
      <div className="card mt-xl">
        <SkeletonCard lines={4} />
      </div>
    </div>
  )
}
