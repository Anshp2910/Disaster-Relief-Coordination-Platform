import { useTranslation } from 'react-i18next'

export default function Footer() {
  const { t } = useTranslation()

  return (
    <footer className="gov-footer">
      <img src="/images/tricolor-accent.svg" alt="" style={{ width: '100%', display: 'block' }} />
      <div className="gov-container">
        <div className="gov-footer-grid">
          <div>
            <h4>{t('footer.quickLinks')}</h4>
            <ul>
              <li><a href="/dashboard">{t('footer.dashboardLink')}</a></li>
              <li><a href="/requests/new">{t('footer.newRequestLink')}</a></li>
              <li><a href="/admin">{t('footer.adminPanel')}</a></li>
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
