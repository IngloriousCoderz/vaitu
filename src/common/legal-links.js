import { currentLocale } from "../i18n/index.js"

// The site's default language has no prefix: /privacy, /en/privacy.
const SITE_DEFAULT_LOCALE = "it"

/** @param {"privacy" | "terms"} doc */
export function legalUrl(doc, locale = currentLocale()) {
  const site = import.meta.env.VITE_SITE_URL
  return locale === SITE_DEFAULT_LOCALE
    ? `${site}/${doc}`
    : `${site}/${locale}/${doc}`
}
