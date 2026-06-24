import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import en from './locales/en.json'
import hi from './locales/hi.json'
import bn from './locales/bn.json'
import ta from './locales/ta.json'
import te from './locales/te.json'
import mr from './locales/mr.json'
import gu from './locales/gu.json'
import kn from './locales/kn.json'
import pa from './locales/pa.json'

let savedLang = 'en'
try { savedLang = localStorage.getItem('language') || 'en' } catch {}

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    hi: { translation: hi },
    bn: { translation: bn },
    ta: { translation: ta },
    te: { translation: te },
    mr: { translation: mr },
    gu: { translation: gu },
    kn: { translation: kn },
    pa: { translation: pa },
  },
  lng: savedLang,
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
})

export default i18n
