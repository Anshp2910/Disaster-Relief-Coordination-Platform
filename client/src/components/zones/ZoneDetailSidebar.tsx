import { useTranslation } from 'react-i18next'
import { MapPin, Users, Activity, AlertTriangle, Edit, Trash2 } from 'lucide-react'
import type { Zone } from './zoneConstants'
import { useAuth } from '../../context/AuthContext'

interface ZoneDetailSidebarProps {
  zone: Zone
  onClose: () => void
  onEdit: (zone: Zone) => void
  onDelete: (id: string) => void
}

export default function ZoneDetailSidebar({ zone, onClose, onEdit, onDelete }: ZoneDetailSidebarProps) {
  const { t } = useTranslation()
  const { user: currentUser } = useAuth()

  return (
    <div className="card flex-shrink-0 w-320">
      <div className="flex flex-between mb-sm">
        <div>
          <h3 className="m-0 text-lg flex items-center gap-xs">
            <MapPin size={16} />
            {zone.name}
          </h3>
          <div className="text-sm mt-xs text-muted">
            {zone.disasterType} &middot; {zone.status}
          </div>
        </div>
        <button onClick={onClose} className="bg-none border-none cursor-pointer text-xl p-0" aria-label={t('common.close')}>&times;</button>
      </div>

      <div className="flex flex-gap-xs mb-sm flex-wrap">
        <span className="severity-badge" data-severity={zone.severity}>
          {zone.severity}
        </span>
        <span className="coverage-badge" data-coverage={zone.coverageStatus}>
          {zone.coverageStatus} coverage
        </span>
      </div>

      <div className="text-base">
        <div className="flex items-center gap-xs">
          <MapPin size={14} />
          <span>{t('zones.radiusLabel')} <strong>{zone.radiusKm} {t('zones.km')}</strong></span>
        </div>
        {(zone.affectedPopulation ?? 0) > 0 && (
          <div className="flex items-center gap-xs">
            <Users size={14} />
            <span>{t('zones.sidepanelAffected')}: <strong>{zone.affectedPopulation?.toLocaleString()}</strong></span>
          </div>
        )}
        <div className="flex items-center gap-xs">
          <Activity size={14} />
          <span>{t('zones.sidepanelOpenRequests')}: <strong className="text-red">{zone.openRequests}</strong></span>
        </div>
        <div className="flex items-center gap-xs">
          <MapPin size={14} />
          <span>{t('zones.totalResources')}: <strong>{zone.totalResources}</strong> {t('zones.units')}</span>
        </div>
      </div>

      {zone.stats && (zone.stats.openRequests ?? 0) > 0 && (
        <div className="mt-md rounded-sm text-sm p-sm bg-warning-soft flex items-center gap-xs">
          <AlertTriangle size={14} />
          <span><strong className="text-red">{t('zones.coverageGap')}</strong> {zone.stats.openRequests} {t('zones.requestsWithNoResources')}</span>
        </div>
      )}

      {currentUser?.role === 'admin' && (
        <div className="flex flex-gap-sm mt-md">
          <button onClick={() => onEdit(zone)} className="btn-ghost btn-sm" aria-label={t('common.edit')}>
            <Edit size={14} />
            {t('common.edit')}
          </button>
          <button onClick={() => onDelete(zone._id)} className="btn-danger text-sm p-xs flex items-center gap-xs" aria-label={t('common.delete')}>
            <Trash2 size={14} />
            {t('common.delete')}
          </button>
        </div>
      )}
    </div>
  )
}
