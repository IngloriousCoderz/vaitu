import { html } from "@inglorious/web"

import { copy, LANGUAGES, localeChoose, localeOf, localePath } from "../site.js"

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
        <select
          class="languages"
          aria-label=${copy(entity).languageLabel}
          @change=${(event) => localeChoose(event.target.value, path)}
        >
          ${LANGUAGES.map(
            ({ locale, label }) =>
              html`<option
                value=${locale}
                lang=${locale}
                ?selected=${locale === current}
              >
                ${label}
              </option>`,
          )}
        </select>
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
