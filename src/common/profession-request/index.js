import { html } from "@inglorious/web"
import { when } from "@inglorious/web/directives/when"

import { t } from "../../i18n/index.js"
import { mailtoUrl } from "../profile.js"
import styles from "./style.module.css"

export const ProfessionRequest = {
  render() {
    const email = import.meta.env.VITE_CONTACT_EMAIL
    return when(
      email,
      () => html`
        <a
          class=${styles.link}
          href=${mailtoUrl(email, {
            subject: t("fields.professionRequestSubject"),
            body: t("fields.professionRequestBody"),
          })}
          >${t("fields.professionRequest")}</a
        >
      `,
    )
  },
}
