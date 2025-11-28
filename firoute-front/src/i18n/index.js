import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

// Import translation files
import azTranslation from "./locales/az/translation.json";
import enTranslation from "./locales/en/translation.json";
import azAdminPanel from "./locales/az/admin-panel.json";
import enAdminPanel from "./locales/en/admin-panel.json";

const resources = {
  az: {
    translation: azTranslation,
    "admin-panel": azAdminPanel,
  },
  en: {
    translation: enTranslation,
    "admin-panel": enAdminPanel,
  },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    supportedLngs: ["az", "en"],
    fallbackLng: "az",
    debug: false,
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
