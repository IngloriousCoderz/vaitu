import { html } from "@inglorious/web"
import { when } from "@inglorious/web/directives/when"

import { readUserId } from "../../api/session.js"
import { Page } from "../../common/page/index.js"
import { LEGAL_UPDATED_ON } from "../../constants/index.js"
import { t } from "../../i18n/index.js"
import { paths } from "../../routes.js"
import styles from "./style.module.css"

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

export const Legal = {
  renderHeader(entity) {
    return {
      title: t(`legal.${entity.doc}.title`),
      back: readUserId() ? paths.about : paths.login,
    }
  },

  render(entity) {
    const values = {
      owner: import.meta.env.VITE_LEGAL_NAME,
      email: import.meta.env.VITE_CONTACT_EMAIL || "",
      interpolation: { escapeValue: false },
    }
    return Page.render({
      variant: "document",
      read: true,
      children: [
        html`
          ${when(
            !readUserId(),
            () =>
              html`<h1 class=${styles.pageTitle}>
                ${t(`legal.${entity.doc}.title`)}
              </h1>`,
          )}
          <p class=${styles.updated}>
            ${t("legal.updated", { date: LEGAL_UPDATED_ON })}
          </p>
          ${SECTIONS[entity.doc].map(
            (id) => html`
              <h2 class=${styles.title}>
                ${t(`legal.${entity.doc}.${id}.title`)}
              </h2>
              <p class=${styles.body}>
                ${t(`legal.${entity.doc}.${id}.body`, values)}
              </p>
            `,
          )}
        `,
      ],
    })
  },
}
