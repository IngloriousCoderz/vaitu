import en from "./i18n/en.json"
import it from "./i18n/it.json"

const catalogues = { en, it }
const DEFAULT_LOCALE = "en"
const STORAGE_KEY = "vaitu-locale"

export const LANGUAGES = [
  { locale: "en", label: "English" },
  { locale: "it", label: "Italiano" },
]

export function localeOf(entity) {
  return entity.locale ?? DEFAULT_LOCALE
}

export function copy(entity) {
  return catalogues[localeOf(entity)]
}

/** SSX leaves the default language unprefixed: /privacy, /it/privacy. */
export function localePath(locale, path) {
  if (locale === DEFAULT_LOCALE) return path
  return path === "/" ? `/${locale}` : `/${locale}${path}`
}

export function localeChoose(locale, path) {
  try {
    localStorage.setItem(STORAGE_KEY, locale)
  } catch {
    // Without storage the choice lasts for this page only.
  }
  location.assign(localePath(locale, path))
}

export function pageHead(entity, path) {
  const site = import.meta.env.VITE_SITE_URL
  const link = (lang, locale) =>
    `<link rel="alternate" hreflang="${lang}" href="${site}${localePath(locale, path)}">`
  return [
    link("x-default", DEFAULT_LOCALE),
    ...LANGUAGES.map(({ locale }) => link(locale, locale)),
    localeOf(entity) === DEFAULT_LOCALE ? browserLocaleRedirect(path) : "",
  ].join("")
}

// Runs before the page paints, so a visitor whose browser prefers another
// language never sees the default one flash. Prefixed pages are an explicit
// choice, such as a shared link, and are left alone.
function browserLocaleRedirect(path) {
  const paths = Object.fromEntries(
    LANGUAGES.map(({ locale }) => [locale, localePath(locale, path)]),
  )
  return `<script>(function(){try{var paths=${JSON.stringify(paths)};var wanted=localStorage.getItem("${STORAGE_KEY}");if(!paths[wanted]){var langs=navigator.languages||[navigator.language];for(var i=0;i<langs.length&&!paths[wanted];i++)wanted=String(langs[i]).slice(0,2).toLowerCase()}if(paths[wanted]&&wanted!=="${DEFAULT_LOCALE}")location.replace(paths[wanted]+location.search+location.hash)}catch(e){}})()</script>`
}
