import { createI18n } from "@inglorious/i18n"

import en from "./locales/en.json"
import fr from "./locales/fr.json"
import it from "./locales/it.json"

// The app's languages. English is the fallback: a key missing from another
// catalogue shows in English rather than as the key itself.
export const { I18n, t, trans, i18next } = createI18n({
  resources: {
    en: { translation: en },
    it: { translation: it },
    fr: { translation: fr },
  },
  defaultLocale: "en",
  storageKey: "vaitu-locale",
})

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
