/**
 * The language a link asks for, like the landing page's `?lang=it`.
 * @param {string} search - A location's query string.
 * @param {string[]} locales - The languages the app has.
 * @returns {string | null}
 */
export function linkedLocale(search, locales) {
  const locale = new URLSearchParams(search).get("lang")
  return locales.includes(locale) ? locale : null
}
