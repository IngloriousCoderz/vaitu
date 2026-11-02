import { html } from "@inglorious/web"

import { copy, pageHead } from "../site.js"
import { Footer, Header } from "./layout.js"

const UPDATED_ON = "2026-11-01"

const SECTIONS = {
  privacy: [
    "who",
    "data",
    "voice",
    "visible",
    "providers",
    "keeping",
    "rights",
  ],
  terms: [
    "what",
    "account",
    "handoff",
    "content",
    "moderation",
    "price",
    "liability",
    "ending",
  ],
}

function fill(text) {
  return text
    .replaceAll("{{owner}}", import.meta.env.VITE_LEGAL_NAME)
    .replaceAll("{{email}}", import.meta.env.VITE_CONTACT_EMAIL)
}

export function legalMetadata(doc) {
  return (entity) => ({
    title: `${copy(entity).legal[doc].title} | Vaitu`,
    head: pageHead(entity, `/${doc}`),
  })
}

export function legalPage(doc) {
  return {
    render(entity) {
      const { legal } = copy(entity)
      return html`
        ${Header.render(entity, `/${doc}`)}
        <main class="document">
          <h1>${legal[doc].title}</h1>
          <p class="note">${legal.updated.replace("{{date}}", UPDATED_ON)}</p>
          ${SECTIONS[doc].map(
            (id) => html`
              <h2>${legal[doc][id].title}</h2>
              <p>${fill(legal[doc][id].body)}</p>
            `,
          )}
        </main>
        ${Footer.render(entity)}
      `
    },
  }
}
