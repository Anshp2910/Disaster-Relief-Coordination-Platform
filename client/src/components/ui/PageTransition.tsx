import { memo, type ReactNode } from 'react'

interface PageTransitionProps {
  children: ReactNode
  className?: string
}

const PageTransition = memo(function PageTransition({ children, className }: PageTransitionProps) {
  return (
    <div className={className}>
      {children}
    </div>
  )
})

export default PageTransition
