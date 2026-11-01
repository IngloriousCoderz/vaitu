import { html } from "@inglorious/web"

import { copy, LANGUAGES, localeOf, localePath } from "../site.js"

export const Header = {
  /** @param {object} entity @param {string} path - This page, in any language. */
  render(entity, path) {
    const current = localeOf(entity)
    return html`
      <header class="top">
        <a class="brand" href=${localePath(current, "/")}>
          <img src="/logo.svg" alt="" width="40" height="27" />
          <span>vaitu</span>
        </a>
        <nav class="languages" aria-label=${copy(entity).languageLabel}>
          ${LANGUAGES.map(
            ({ locale, label }) =>
              html`<a
                href=${localePath(locale, path)}
                lang=${locale}
                aria-current=${locale === current ? "page" : "false"}
                >${label}</a
              >`,
          )}
        </nav>
      </header>
    `
  },
}

export const Footer = {
  render(entity) {
    const c = copy(entity)
    const locale = localeOf(entity)
    return html`
      <footer class="foot">
        <p>${c.credits}</p>
        <p>
          <a href=${localePath(locale, "/privacy")}>${c.privacy}</a>
          <a href=${localePath(locale, "/terms")}>${c.terms}</a>
          <a href=${`mailto:${import.meta.env.VITE_CONTACT_EMAIL}`}
            >${c.contact}</a
          >
        </p>
        <p>© ${import.meta.env.VITE_LEGAL_NAME}</p>
      </footer>
    `
  },
}
