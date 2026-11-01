import ar from "./i18n/ar.json"
import en from "./i18n/en.json"
import fr from "./i18n/fr.json"
import it from "./i18n/it.json"
import ja from "./i18n/ja.json"

const catalogues = { it, en, fr, ja, ar }
const DEFAULT_LOCALE = "it"

export const LANGUAGES = [
  { locale: "it", label: "Italiano" },
  { locale: "en", label: "English" },
  { locale: "fr", label: "Français" },
  { locale: "ja", label: "日本語" },
  { locale: "ar", label: "العربية" },
]

export function localeOf(entity) {
  return entity.locale ?? DEFAULT_LOCALE
}

export function copy(entity) {
  return catalogues[localeOf(entity)]
}

/** SSX leaves the default language unprefixed: /privacy, /en/privacy. */
export function localePath(locale, path) {
  if (locale === DEFAULT_LOCALE) return path
  return path === "/" ? `/${locale}` : `/${locale}${path}`
}

export function alternateLinks(path) {
  const site = import.meta.env.VITE_SITE_URL
  const link = (lang, locale) =>
    `<link rel="alternate" hreflang="${lang}" href="${site}${localePath(locale, path)}">`
  return [
    link("x-default", DEFAULT_LOCALE),
    ...LANGUAGES.map(({ locale }) => link(locale, locale)),
  ].join("")
}
