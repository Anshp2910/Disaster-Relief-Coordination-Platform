import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

function getCurrentUser() {
  try { return JSON.parse(localStorage.getItem('user') || 'null') } catch { return null }
}

export default function Footer() {
  const { t } = useTranslation()
  const currentUser = getCurrentUser()

  return (
    <footer className="gov-footer">
      <img src="/images/tricolor-accent.svg" alt="" style={{ width: '100%', display: 'block' }} />
      <div className="gov-container">
        <div className="gov-footer-grid">
          <div>
            <h4>{t('footer.quickLinks')}</h4>
            <ul>
              <li><Link to="/dashboard">{t('footer.dashboardLink')}</Link></li>
              <li><Link to="/zones">{t('nav.zones') || 'Zones'}</Link></li>
              <li><Link to="/resources">{t('nav.resources') || 'Resources'}</Link></li>
              <li><Link to="/requests/new">{t('footer.newRequestLink')}</Link></li>
              {currentUser?.role === 'admin' && (
                <li><Link to="/admin">{t('footer.adminPanel')}</Link></li>
              )}
            </ul>
          </div>
          <div>
            <h4>{t('footer.contact')}</h4>
            <ul>
              <li>{t('footer.emergencyHelpline')}</li>
              <li>{t('footer.disasterHelpline')}</li>
              <li>{t('footer.email')}</li>
              <li>{t('footer.ndma')}</li>
            </ul>
          </div>
          <div>
            <h4>{t('footer.about')}</h4>
            <ul>
              <li>{t('footer.aboutText')}</li>
              <li>{t('footer.connectingVolunteers')}</li>
              <li>{t('footer.builtFor')}</li>
            </ul>
          </div>
        </div>
      </div>
      <div className="gov-footer-bottom">
        <div className="gov-container">
          <span>{t('footer.copyright')}</span>
          <span>{t('footer.lastUpdated')}</span>
        </div>
      </div>
    </footer>
  )
}
