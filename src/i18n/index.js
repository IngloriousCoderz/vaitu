import { createI18n } from "@inglorious/i18n"

// The app's languages are the catalogues in ./locales, one file each, loaded
// when needed. English is the fallback: a key missing from another catalogue
// shows in English rather than as the key itself. The language follows the
// user's account through their profile.
export const {
  I18n,
  t,
  trans,
  ready,
  languages,
  currentLocale,
  labelled,
  translatedLabel,
} = createI18n({
  catalogues: import.meta.glob("./locales/*.json"),
  defaultLocale: "en",
  storageKey: "vaitu-locale",
  saveUserLocale: (locale, api) => api.notify("#profile:localeSave", locale),
})
