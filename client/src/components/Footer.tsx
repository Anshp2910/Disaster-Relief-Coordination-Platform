import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { LayoutDashboard, Map, Package, PlusSquare, Shield, Phone, Mail, Building2, Heart, Globe, Radio } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

export function Footer() {
  // Add ARIA live region for dynamic year
  const { t } = useTranslation()
  const { user: currentUser } = useAuth()

  return (
    <footer className="gov-footer">
      <div className="container">
        <div className="gov-footer-grid">
          <div className="gov-footer-brand-col">
            <div className="gov-footer-brand">
              <svg width="32" height="32" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <rect width="40" height="40" rx="10" fill="var(--accent)" />
                <path d="M20 8a2 2 0 0 1 2 2v18a2 2 0 0 1-4 0V10a2 2 0 0 1 2-2z" fill="white" />
                <path d="M12 16a2 2 0 0 1 2 2v10a2 2 0 0 1-4 0V18a2 2 0 0 1 2-2z" fill="white" opacity="0.8" />
                <path d="M28 12a2 2 0 0 1 2 2v14a2 2 0 0 1-4 0V14a2 2 0 0 1 2-2z" fill="white" opacity="0.9" />
              </svg>
              <div>
                <div className="gov-footer-brand-title">Disaster Relief</div>
                <div className="gov-footer-brand-sub">Coordination Platform</div>
              </div>
            </div>
            <p className="gov-footer-description">
              {t('footer.aboutText')} — {t('footer.connectingVolunteers')}
            </p>
          </div>
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
              <li className="gov-footer-contact-item">
                <Phone size={14} />
                <span>{t('footer.emergencyHelpline')}</span>
              </li>
              <li className="gov-footer-contact-item">
                <Phone size={14} />
                <span>{t('footer.disasterHelpline')}</span>
              </li>
              <li className="gov-footer-contact-item">
                <Mail size={14} />
                <span>{t('footer.email')}</span>
              </li>
              <li className="gov-footer-contact-item">
                <Building2 size={14} />
                <span>{t('footer.ndma')}</span>
              </li>
            </ul>
          </div>
          <div>
            <h4>{t('footer.about')}</h4>
            <ul>
              <li className="gov-footer-about-item">
                <Heart size={14} />
                <span>{t('footer.aboutText')}</span>
              </li>
              <li className="gov-footer-about-item">
                <Globe size={14} />
                <span>{t('footer.connectingVolunteers')}</span>
              </li>
              <li className="gov-footer-about-item">
                <Building2 size={14} />
                <span>{t('footer.builtFor')}</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
      <div className="gov-footer-bottom">
        <div className="container">
          <span aria-live="polite">&copy; {new Date().getFullYear()} Disaster Relief Coordination Platform. {t('footer.copyright')}</span>
          <span className="gov-footer-bottom-links">
            <a href="#" onClick={(e) => e.preventDefault()} className="gov-footer-link">Privacy Policy</a>
            <span className="gov-footer-dot">&middot;</span>
            <a href="#" onClick={(e) => e.preventDefault()} className="gov-footer-link">Terms of Service</a>
            <span className="gov-footer-dot">&middot;</span>
            <span>{t('footer.lastUpdated')}</span>
          </span>
        </div>
      </div>
    </footer>
  )
}
