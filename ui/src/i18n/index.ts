import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { Langs } from '~/consts';
import { storage } from '~/utils/storage';
import { type TranslationKeys, en } from './en';
import { zh } from './zh';

export function initI18n() {
  const resources = {
    en: {
      translation: en,
    },
    zh: {
      translation: zh,
    },
  };

  const lang = storage.getLanguage();

  i18n.use(initReactI18next).init({
    resources,
    lng: lang,
    fallbackLng: Langs.En,
    interpolation: {
      escapeValue: false,
    },
  });

  document.documentElement.lang = lang;
}

export function t(key: TranslationKeys, obj?: Record<string, any>) {
  return i18n.t(key, obj);
}
