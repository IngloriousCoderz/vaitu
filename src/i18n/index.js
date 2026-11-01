import { createI18n } from "@inglorious/i18n"

import { linkedLocale } from "./linked-locale.js"

const catalogues = import.meta.glob("./locales/*.json")
const STORAGE_KEY = "vaitu-locale"

// Before createI18n, which picks the language once, from this same key. A
// signed-in user's own language still replaces it when their profile loads.
rememberLinkedLocale()

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
  catalogues,
  defaultLocale: "en",
  storageKey: STORAGE_KEY,
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

function rememberLinkedLocale() {
  if (typeof window === "undefined") return
  const locales = Object.keys(catalogues).map((path) =>
    path.replace(/^.*\/(.+)\.json$/, "$1"),
  )
  const locale = linkedLocale(window.location.search, locales)
  if (!locale) return
  try {
    localStorage.setItem(STORAGE_KEY, locale)
  } catch {
    // Blocked storage: the page just opens in the detected language.
  }
}

/**
 * A message kept in state, in the language of this render. State never holds
 * translated text, which would stay in the language it was written in: our own
 * messages are a key, or `{ key, values }` when they interpolate, while a
 * message from the server is kept as it came and shown as it is.
 * @param {string | { key: string, values?: object } | null | undefined} message
 * @returns {string | null | undefined}
 */
export function translated(message) {
  if (typeof message === "object") {
    return message ? t(message.key, message.values) : null
  }
  if (typeof message === "string" && i18next.exists(message)) return t(message)
  return message
}
