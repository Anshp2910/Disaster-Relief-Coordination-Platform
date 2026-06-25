import type { SVGProps } from 'react'

type IconName =
  | 'search'
  | 'moon'
  | 'sun'
  | 'user'
  | 'logout'
  | 'menu'
  | 'close'
  | 'bell'
  | 'mapPin'
  | 'alertTriangle'
  | 'alertCircle'
  | 'checkCircle'
  | 'info'
  | 'warning'
  | 'arrowRight'
  | 'arrowLeft'
  | 'chevronDown'
  | 'chevronUp'
  | 'plus'
  | 'minus'
  | 'edit'
  | 'trash'
  | 'download'
  | 'upload'
  | 'refreshCw'
  | 'home'
  | 'globe'
  | 'clock'

const ICON_PATHS: Record<IconName, { paths: string[]; viewBox?: string }> = {
  search: { paths: ['M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z'] },
  moon: { paths: ['M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z'] },
  sun: { paths: [
    'M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42',
    'M12 17a5 5 0 100-10 5 5 0 000 10z',
  ] },
  user: { paths: ['M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2', 'M12 7a4 4 0 100-8 4 4 0 000 8z'] },
  logout: { paths: ['M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4', 'M16 17l5-5-5-5', 'M21 12H9'] },
  menu: { paths: ['M3 12h18', 'M3 6h18', 'M3 18h18'] },
  close: { paths: ['M18 6L6 18', 'M6 6l12 12'] },
  bell: { paths: ['M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9', 'M13.73 21a2 2 0 01-3.46 0'] },
  mapPin: { paths: ['M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z', 'M15 10a3 3 0 11-6 0 3 3 0 016 0z'] },
  alertTriangle: { paths: ['M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z', 'M12 9v4', 'M12 17h.01'] },
  alertCircle: { paths: ['M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z', 'M12 8v4', 'M12 16h.01'] },
  checkCircle: { paths: ['M22 11.08V12a10 10 0 11-5.93-9.14', 'M22 4L12 14.01', 'M9 11l3 3L22 4'] },
  info: { paths: ['M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z', 'M12 16v-4', 'M12 8h.01'] },
  warning: { paths: ['M12 2l10 17H2L12 2z', 'M12 9v4', 'M12 17h.01'] },
  arrowRight: { paths: ['M5 12h14', 'M12 5l7 7-7 7'] },
  arrowLeft: { paths: ['M19 12H5', 'M12 19l-7-7 7-7'] },
  chevronDown: { paths: ['M6 9l6 6 6-6'] },
  chevronUp: { paths: ['M18 15l-6-6-6 6'] },
  plus: { paths: ['M12 5v14', 'M5 12h14'] },
  minus: { paths: ['M5 12h14'] },
  edit: { paths: ['M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7'] },
  trash: { paths: ['M3 6h18', 'M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2'] },
  download: { paths: ['M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4', 'M7 10l5 5 5-5', 'M12 15V3'] },
  upload: { paths: ['M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4', 'M17 8l-5-5-5 5', 'M12 3v12'] },
  refreshCw: { paths: ['M23 4v6h-6', 'M1 20v-6h6', 'M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15'] },
  home: { paths: ['M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z', 'M9 22V12h6v10'] },
  globe: { paths: ['M22 12c0 5.523-4.477 10-10 10S2 17.523 2 12 6.477 2 12 2s10 4.477 10 10z', 'M2 12h20', 'M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z'] },
  clock: { paths: ['M12 2C6.486 2 2 6.486 2 12s4.486 10 10 10 10-4.486 10-10S17.514 2 12 2z', 'M12 6v6l4 2'] },
}

interface IconProps extends SVGProps<SVGSVGElement> {
  name: IconName
  size?: number
  label?: string
}

export default function Icon({ name, size = 16, label, className = '', ...rest }: IconProps) {
  const icon = ICON_PATHS[name]
  if (!icon) return null

  return (
    <svg
      width={size}
      height={size}
      viewBox={icon.viewBox || '0 0 24 24'}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      role={label ? 'img' : 'presentation'}
      aria-label={label}
      aria-hidden={!label}
      {...rest}
    >
      {icon.paths.map((d, i) => (
        <path key={i} d={d} />
      ))}
    </svg>
  )
}
