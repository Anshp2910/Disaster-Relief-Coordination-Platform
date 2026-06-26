import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { LayoutDashboard, Map, Package, PlusSquare, Shield, Phone, Mail, Building2, Heart, Globe, Radio } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

export default function Footer() {
  const { t } = useTranslation()
  const { user: currentUser } = useAuth()

  return (
    <footer className="gov-footer">
      <div className="container">
        <div className="gov-footer-grid">
          <div>
            <h4>{t('footer.quickLinks')}</h4>
            <ul>
              <li><Link to="/dashboard"><LayoutDashboard size={14} /> {t('footer.dashboardLink')}</Link></li>
              <li><Link to="/zones"><Map size={14} /> {t('nav.zones') || 'Zones'}</Link></li>
              <li><Link to="/resources"><Package size={14} /> {t('nav.resources') || 'Resources'}</Link></li>
              <li><Link to="/requests/new"><PlusSquare size={14} /> {t('footer.newRequestLink')}</Link></li>
              <li><Link to="/command-center"><Radio size={14} /> {t('nav.commandCenter') || 'Command Center'}</Link></li>
              {currentUser?.role === 'admin' && (
                <li><Link to="/admin"><Shield size={14} /> {t('footer.adminPanel')}</Link></li>
              )}
            </ul>
          </div>
          <div>
            <h4>{t('footer.contact')}</h4>
            <ul>
              <li><Phone size={14} /> {t('footer.emergencyHelpline')}</li>
              <li><Phone size={14} /> {t('footer.disasterHelpline')}</li>
              <li><Mail size={14} /> {t('footer.email')}</li>
              <li><Building2 size={14} /> {t('footer.ndma')}</li>
            </ul>
          </div>
          <div>
            <h4>{t('footer.about')}</h4>
            <ul>
              <li><Heart size={14} /> {t('footer.aboutText')}</li>
              <li><Globe size={14} /> {t('footer.connectingVolunteers')}</li>
              <li><Building2 size={14} /> {t('footer.builtFor')}</li>
            </ul>
          </div>
        </div>
      </div>
      <div className="gov-footer-bottom">
        <div className="container">
          <span>{t('footer.copyright')}</span>
          <span>{t('footer.lastUpdated')}</span>
        </div>
      </div>
    </footer>
  )
}
