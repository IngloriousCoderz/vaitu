import { createI18n } from "@inglorious/i18n"

const {
  I18n: BaseI18n,
  t,
  trans,
  ready,
  languages,
  localized,
  currentLocale,
} = createI18n({
  catalogues: import.meta.glob("./locales/*.json"),
  // fr, ja and ar stay translated, but launch offers only these.
  locales: ["en", "it"],
  defaultLocale: "en",
  storageKey: "vaitu-locale",
  queryParam: "lang",
  saveUserLocale: (locale, api) =>
    api.notify("#preferences:localeSave", locale),
})

export { currentLocale, languages, localized, ready, t, trans }

export const I18n = [
  BaseI18n,
  {
    sessionEnd(entity) {
      BaseI18n.userLocaleClear(entity)
    },
  },
]
