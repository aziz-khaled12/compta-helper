import i18n from "i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import { initReactI18next } from "react-i18next";
import fr from "./fr";
import ar from "./ar";

export const LANGUAGES = [
  { code: "fr", label: "Français" },
  { code: "ar", label: "العربية" },
] as const;

export type AppLanguage = (typeof LANGUAGES)[number]["code"];

export const LANGUAGE_STORAGE_KEY = "djerdjera-lang";

/**
 * Keeps `<html dir>` and `<html lang>` in line with the active language so the
 * whole document flips RTL for Arabic users. Applied at init and on every
 * language change.
 */
function applyLocaleMeta(lng: string): void {
  const isArabic = lng.toLowerCase().startsWith("ar");
  document.documentElement.dir = isArabic ? "rtl" : "ltr";
  document.documentElement.lang = lng;
}

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      fr: { translation: fr },
      ar: { translation: ar },
    },
    fallbackLng: "fr",
    supportedLngs: ["fr", "ar"],
    detection: {
      order: ["localStorage", "navigator"],
      caches: ["localStorage"],
      lookupLocalStorage: LANGUAGE_STORAGE_KEY,
    },
    interpolation: { escapeValue: false },
    returnNull: false,
  });

applyLocaleMeta(i18n.resolvedLanguage ?? i18n.language);
i18n.on("languageChanged", applyLocaleMeta);

export default i18n;