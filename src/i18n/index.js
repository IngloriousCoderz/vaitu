import { createI18n } from "@inglorious/i18n"

const {
  I18n: BaseI18n,
  t,
  trans,
  ready,
  languages,
  currentLocale,
  labelled,
  translatedLabel,
  i18next,
} = createI18n({
  catalogues: import.meta.glob("./locales/*.json"),
  defaultLocale: "en",
  storageKey: "vaitu-locale",
  saveUserLocale: (locale, api) =>
    api.notify("#preferences:localeSave", locale),
})

export { currentLocale, labelled, languages, ready, t, trans, translatedLabel }

export const I18n = [
  BaseI18n,
  {
    sessionEnd(entity) {
      BaseI18n.userLocaleClear(entity)
    },
  },
]

/**
 * A message kept in state, in the language of this render. State never holds
 * translated text, which would stay in the language it was written in: our own
 * messages are a key, or `{ key, values }` when they interpolate, while a
 * message from the server is kept as it came and shown as it is.
 * @param {string | { key: string, values?: object } | null | undefined} message
 * @returns {string | null | undefined}
 */
export function translated(message) {
  if (message?.key) return t(message.key, message.values)
  if (typeof message === "string" && i18next.exists(message)) return t(message)
  return message
}
