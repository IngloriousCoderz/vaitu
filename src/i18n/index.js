import { createI18n } from "@inglorious/i18n"

import { readUser } from "../api/session.js"
import en from "./locales/en.json"
import fr from "./locales/fr.json"
import it from "./locales/it.json"

// The app's languages. English is the fallback: a key missing from another
// catalogue shows in English rather than as the key itself.
const i18n = createI18n({
  resources: {
    en: { translation: en },
    it: { translation: it },
    fr: { translation: fr },
  },
  defaultLocale: "en",
  storageKey: "vaitu-locale",
})

export const { t, trans, i18next } = i18n

// The library's type, plus the user's language kept in their profile, so it
// follows them to every device. A choice made signed in is saved straight
// away. One made on the sign-in screen, where there is no profile yet, wins
// over the saved one once the profile loads: it is the more recent.
export const I18n = {
  ...i18n.I18n,

  localeChange(entity, locale, api) {
    const previous = entity.locale
    i18n.I18n.localeChange(entity, locale)
    if (entity.locale === previous) return

    if (readUser()) {
      api.notify("#profile:localeSave", entity.locale)
    } else {
      entity.isUnsaved = true
    }
  },

  // A pick from the language combobox, which sends `{ field, value }`.
  localeSelect(entity, { value }, api) {
    I18n.localeChange(entity, value, api)
  },

  // The profile loaded with the language it has saved. Once per user: the
  // profile reloads whenever an application changes, and a later load could
  // carry a language that a save still in flight is replacing.
  localeSync(entity, { userId, locale }, api) {
    if (entity.syncedUserId === userId) return
    entity.syncedUserId = userId

    if (entity.isUnsaved || !locale) {
      entity.isUnsaved = false
      api.notify("#profile:localeSave", entity.locale)
      return
    }

    i18n.I18n.localeChange(entity, locale)
  },
}

// Each language by its own name, for the language picker: whoever needs it
// recognises it whatever language is active.
export const LANGUAGE_NAMES = {
  en: "English",
  it: "Italiano",
  fr: "Français",
}

// The active locale, for Intl formatters (dates, numbers).
export function currentLocale() {
  return i18next.language
}

// A data item whose label follows the active language: `label` is read
// through t() every time, and `labelKey` survives being copied into store
// state, where a getter would freeze into the text of the moment.
export function labelled(labelKey, fields = {}) {
  return {
    ...fields,
    labelKey,
    get label() {
      return t(labelKey)
    },
  }
}

// The label to show for an option: translated when it carries a key, as
// is otherwise (country and region names are data, not copy).
export function translatedLabel(option) {
  return option.labelKey ? t(option.labelKey) : option.label
}
