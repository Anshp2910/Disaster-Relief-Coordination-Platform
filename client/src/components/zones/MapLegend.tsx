import { useTranslation } from 'react-i18next'
import { SEVERITY_COLORS, COVERAGE_COLORS } from './zoneConstants'

export default function MapLegend() {
  const { t } = useTranslation()

  return (
    <div className="flex flex-gap-lg mt-sm flex-wrap">
      {Object.entries(SEVERITY_COLORS).map(([sev, c]) => (
        <div key={sev} className="gap-row-xs text-sm flex items-center gap-xs">
          <div className="w-3 h-3 rounded-sm" style={{ background: c.fill, border: `2px solid ${c.stroke}` }} />
          <span>{t('priorities.' + sev)}</span>
        </div>
      ))}
      <span className="text-sm text-muted">&middot;</span>
      {Object.entries(COVERAGE_COLORS).map(([cov, c]) => (
        <div key={cov} className="gap-row-xs text-sm flex items-center gap-xs">
          <div className="w-3 h-3 rounded-sm" style={{ background: c }} />
          <span>{t('zones.' + cov.toLowerCase())}</span>
        </div>
      ))}
    </div>
  )
}
