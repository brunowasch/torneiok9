import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import ptBR from './locales/pt-BR.json';
import esAR from './locales/es-AR.json';
import esUY from './locales/es-UY.json';

const resources = {
    'pt-BR': { translation: ptBR },
    'es-AR': { translation: esAR },
    'es-UY': { translation: esUY },
};

i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
        resources,
        fallbackLng: 'pt-BR',
        supportedLngs: ['pt-BR', 'es-AR', 'es-UY'],
        defaultNS: 'translation',
        interpolation: {
            escapeValue: false,
        },
        detection: {
            order: ['localStorage', 'navigator'],
            caches: ['localStorage'],
            lookupLocalStorage: 'i18nLng',
        },
    });

export default i18n;
export const SUPPORTED_LANGUAGES = [
    { code: 'pt-BR', label: '🇧🇷 Português', flag: '🇧🇷' },
    { code: 'es-AR', label: '🇦🇷 Español (AR)', flag: '🇦🇷' },
    { code: 'es-UY', label: '🇺🇾 Español (UY)', flag: '🇺🇾' },
] as const;

export type LanguageCode = (typeof SUPPORTED_LANGUAGES)[number]['code'];
