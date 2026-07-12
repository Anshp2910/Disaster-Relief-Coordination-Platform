import { useTranslation } from 'react-i18next'
import { Modal, ModernSelect, RippleBtn } from '../ui'
import { SEVERITY_COLORS, DISASTER_ICONS } from './zoneConstants'
import type { Zone, ZoneForm } from './zoneConstants'

interface ZoneFormModalProps {
  open: boolean
  editZone: Zone | null
  form: ZoneForm
  saving: boolean
  onFormChange: (field: keyof ZoneForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void
  onSelectChange: (field: keyof ZoneForm) => (v: string) => void
  onSubmit: (e: React.FormEvent) => void
  onClose: () => void
}

export default function ZoneFormModal({ open, editZone, form, saving, onFormChange, onSelectChange, onSubmit, onClose }: ZoneFormModalProps) {
  const { t } = useTranslation()

  return (
    <Modal open={open} onClose={onClose} title={editZone ? t('zones.editZoneTitle') : t('zones.addZoneTitle')}>
      <form onSubmit={onSubmit}>
        <div className="ff-group">
          <div className={`ff-wrap ${form.name ? 'ff-focused' : ''}`}>
            <input
              id="zone-name"
              type="text"
              value={form.name}
              onChange={onFormChange('name')}
              required
              maxLength={100}
              className={`ff-input ${form.name ? 'ff-input-filled' : ''}`}
              placeholder={t('zones.zoneNamePlaceholder')}
            />
            <label htmlFor="zone-name" className={`ff-label ${form.name ? 'ff-label-float' : ''}`}>
              {t('zones.zoneNamePlaceholder')}
            </label>
          </div>
        </div>

        <div className="form-row-3">
          <div className="ff-group flex-1">
            <ModernSelect
              label={t('zones.disasterType') || 'Disaster type'}
              options={Object.keys(DISASTER_ICONS).map((d) => ({ label: d, value: d }))}
              value={form.disasterType}
              onChange={onSelectChange('disasterType')}
            />
          </div>
          <div className="ff-group flex-1">
            <ModernSelect
              label={t('zones.severity') || 'Severity'}
              options={Object.keys(SEVERITY_COLORS).map((s) => ({ label: s, value: s }))}
              value={form.severity}
              onChange={onSelectChange('severity')}
            />
          </div>
          <div className="ff-group flex-1">
            <ModernSelect
              label={t('zones.status') || 'Status'}
              options={['Active', 'Monitoring', 'Resolved', 'Closed'].map((s) => ({ label: s, value: s }))}
              value={form.status}
              onChange={onSelectChange('status')}
            />
          </div>
        </div>

        <div className="form-row-2">
          <div className="ff-group flex-1">
            <div className={`ff-wrap ${form.centerLat ? 'ff-focused' : ''}`}>
              <input
                id="zone-centerlat"
                type="number"
                step="any"
                value={form.centerLat}
                onChange={onFormChange('centerLat')}
                required
                className={`ff-input ${form.centerLat ? 'ff-input-filled' : ''}`}
                placeholder={t('zones.centerLat')}
              />
              <label htmlFor="zone-centerlat" className={`ff-label ${form.centerLat ? 'ff-label-float' : ''}`}>
                {t('zones.centerLat')}
              </label>
            </div>
          </div>
          <div className="ff-group flex-1">
            <div className={`ff-wrap ${form.centerLng ? 'ff-focused' : ''}`}>
              <input
                id="zone-centerlng"
                type="number"
                step="any"
                value={form.centerLng}
                onChange={onFormChange('centerLng')}
                required
                className={`ff-input ${form.centerLng ? 'ff-input-filled' : ''}`}
                placeholder={t('zones.centerLng')}
              />
              <label htmlFor="zone-centerlng" className={`ff-label ${form.centerLng ? 'ff-label-float' : ''}`}>
                {t('zones.centerLng')}
              </label>
            </div>
          </div>
        </div>

        <div className="form-row-2">
          <div className="ff-group flex-1">
            <div className={`ff-wrap ${form.radiusKm ? 'ff-focused' : ''}`}>
              <input
                id="zone-radius"
                type="number"
                value={form.radiusKm}
                onChange={onFormChange('radiusKm')}
                required
                min="1"
                className={`ff-input ${form.radiusKm ? 'ff-input-filled' : ''}`}
                placeholder={t('zones.radiusKm')}
              />
              <label htmlFor="zone-radius" className={`ff-label ${form.radiusKm ? 'ff-label-float' : ''}`}>
                {t('zones.radiusKm')}
              </label>
            </div>
          </div>
          <div className="ff-group flex-1">
            <div className={`ff-wrap ${form.affectedPopulation ? 'ff-focused' : ''}`}>
              <input
                id="zone-population"
                type="number"
                value={form.affectedPopulation}
                onChange={onFormChange('affectedPopulation')}
                className={`ff-input ${form.affectedPopulation ? 'ff-input-filled' : ''}`}
                placeholder={t('zones.affectedPopulationPlaceholder')}
              />
              <label htmlFor="zone-population" className={`ff-label ${form.affectedPopulation ? 'ff-label-float' : ''}`}>
                {t('zones.affectedPopulationPlaceholder')}
              </label>
            </div>
          </div>
        </div>

        <div className="ff-group">
          <div className={`ff-wrap ${form.description ? 'ff-focused' : ''}`}>
            <textarea
              id="zone-description"
              value={form.description}
              onChange={onFormChange('description')}
              rows={2}
              maxLength={2000}
              className="ff-input ff-textarea"
              placeholder={t('zones.description')}
            />
            <label htmlFor="zone-description" className={`ff-label ff-label-with-icon ${form.description ? 'ff-label-float' : ''}`}>
              {t('zones.description')}
            </label>
          </div>
        </div>

        <div className="ff-group">
          <div className={`ff-wrap ${form.notes ? 'ff-focused' : ''}`}>
            <textarea
              id="zone-notes"
              value={form.notes}
              onChange={onFormChange('notes')}
              rows={2}
              maxLength={2000}
              className="ff-input ff-textarea"
              placeholder={t('zones.notes')}
            />
            <label htmlFor="zone-notes" className={`ff-label ff-label-with-icon ${form.notes ? 'ff-label-float' : ''}`}>
              {t('zones.notes')}
            </label>
          </div>
        </div>

        <div className="flex gap-sm mt">
          <RippleBtn type="submit" className="" disabled={saving} aria-label={t('common.submit')}>
            {saving ? '...' : (editZone ? t('zones.update') : t('zones.create'))}
          </RippleBtn>
          <button type="button" onClick={onClose} className="btn-ghost btn-sm" aria-label={t('common.cancel')}>{t('zones.cancel')}</button>
        </div>
      </form>
    </Modal>
  )
}
