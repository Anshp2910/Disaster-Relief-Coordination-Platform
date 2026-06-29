import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import en from './locales/en.json'

let savedLang = 'en'
try { savedLang = localStorage.getItem('language') || 'en' } catch { /* noop */ }

const localeMap: Record<string, () => Promise<{ default: Record<string, unknown> }>> = {
  hi: () => import('./locales/hi.json'),
  bn: () => import('./locales/bn.json'),
  ta: () => import('./locales/ta.json'),
  te: () => import('./locales/te.json'),
  mr: () => import('./locales/mr.json'),
  gu: () => import('./locales/gu.json'),
  kn: () => import('./locales/kn.json'),
  pa: () => import('./locales/pa.json'),
  ur: () => import('./locales/ur.json'),
}

const loadingLocales = new Set<string>()
const loadLocale = async (lng: string) => {
  if (lng === 'en' || !localeMap[lng] || loadingLocales.has(lng)) return
  loadingLocales.add(lng)
  try {
    const mod = await localeMap[lng]()
    i18n.addResourceBundle(lng, 'translation', mod.default)
  } catch (err) {
    console.warn(`Failed to load locale "${lng}":`, (err as Error).message)
  } finally {
    loadingLocales.delete(lng)
  }
}

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
  },
  lng: savedLang,
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
})

if (savedLang !== 'en') {
  loadLocale(savedLang)
}

const origChangeLanguage = i18n.changeLanguage.bind(i18n)
i18n.changeLanguage = (async (lng: string, callback?: import('i18next').Callback) => {
  await loadLocale(lng)
  return origChangeLanguage(lng, callback)
}) as typeof i18n.changeLanguage

i18n.on('languageChanged', (lng: string) => {
  document.documentElement.dir = lng === 'ur' ? 'rtl' : 'ltr'
  document.documentElement.lang = lng
})

export default i18n
