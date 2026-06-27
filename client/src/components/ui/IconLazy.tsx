import React, { Suspense } from 'react';

/**
 * IconLazy loads a Lucide icon component lazily.
 * Usage: const Alert = React.lazy(() => import('lucide-react').then(m => ({ default: m.AlertTriangle })));
 * This wrapper simplifies the import pattern and provides a fallback.
 */
export function IconLazy({ importPath, name, size = 16, className = '', ...props }: {
  importPath: string; // e.g. 'lucide-react'
  name: string; // exported icon name
  size?: number;
  className?: string;
  [key: string]: any;
}) {
  const LazyComponent = React.lazy(() =>
    import(importPath).then((mod) => ({ default: (mod as any)[name] }))
  );
  return (
    <Suspense fallback={<span className={className} style={{ width: size, height: size }} />}>
      <LazyComponent size={size} className={className} {...props} />
    </Suspense>
  );
}
