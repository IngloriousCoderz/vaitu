import { createI18n } from "@inglorious/i18n"

const DEFAULT_LOCALE = "en"

const {
  I18n: BaseI18n,
  t,
  trans,
  ready,
  languages,
  currentLocale,
} = createI18n({
  catalogues: import.meta.glob("./locales/*.json"),
  // fr, ja and ar stay translated, but launch offers only these.
  locales: ["en", "it"],
  defaultLocale: DEFAULT_LOCALE,
  storageKey: "vaitu-locale",
  queryParam: "lang",
  saveUserLocale: (locale, api) =>
    api.notify("#preferences:localeSave", locale),
})

export { currentLocale, languages, ready, t, trans }

/** A record's own translation, in the current locale or else the default one. */
export function localized(labels) {
  return labels[currentLocale()] ?? labels[DEFAULT_LOCALE]
}

export const I18n = [
  BaseI18n,
  {
    sessionEnd(entity) {
      BaseI18n.userLocaleClear(entity)
    },
  },
]
