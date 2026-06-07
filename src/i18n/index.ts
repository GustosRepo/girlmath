import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';

import en from './locales/en';
import es from './locales/es';
import th from './locales/th';
import { loadLanguage } from '../utils/storage';

const SUPPORTED = ['en', 'es', 'th'];

// Get device language
const deviceLang = Localization.getLocales()?.[0]?.languageCode ?? 'en';
const deviceDefault = SUPPORTED.includes(deviceLang) ? deviceLang : 'en';

// Initialize i18n with device language as default
i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    es: { translation: es },
    th: { translation: th },
  },
  lng: deviceDefault,
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false,
  },
  compatibilityJSON: 'v4',
  react: {
    useSuspense: false,
  },
});

// Load saved language preference and update i18n
// Export this promise so App can wait for it if needed
export const i18nReady = loadLanguage()
  .then((savedLang) => {
    if (savedLang && savedLang !== i18n.language) {
      return i18n.changeLanguage(savedLang).then(() => undefined);
    }
    return Promise.resolve();
  })
  .catch((error) => {
    console.warn('[i18n] Failed to load saved language:', error);
    return Promise.resolve(); // Don't block app startup on i18n errors
  });

export default i18n;
