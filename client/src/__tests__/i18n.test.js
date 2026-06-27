import { describe, it, expect } from 'vitest'
import i18n from '../i18n'

describe('i18n', () => {
  it('exports an i18n instance', () => {
    expect(i18n).toBeTruthy()
  })

  it('has English as the current language', () => {
    expect(i18n.language).toBe('en')
  })

  it('has English translation bundle loaded', () => {
    expect(i18n.hasResourceBundle('en', 'translation')).toBe(true)
  })

  it('has all Indian language bundles loaded', async () => {
    const langs = ['hi', 'bn', 'ta', 'te', 'mr', 'gu', 'kn', 'pa']
    // Load each bundle dynamically then check they're registered
    for (const lang of langs) {
      await i18n.changeLanguage(lang)
      expect(i18n.hasResourceBundle(lang, 'translation')).toBe(true)
    }
    // Reset back to English
    await i18n.changeLanguage('en')
  })

  it('uses en as fallback language', () => {
    const fallback = i18n.options.fallbackLng
    if (Array.isArray(fallback)) {
      expect(fallback).toContain('en')
    } else {
      expect(fallback).toBe('en')
    }
  })

  it('has interpolation escaping disabled', () => {
    expect(i18n.options.interpolation.escapeValue).toBe(false)
  })

  it('translates a known key in English', () => {
    const t = i18n.t
    const result = t('app.title')
    expect(typeof result).toBe('string')
  })
})
