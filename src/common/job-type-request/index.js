import { html } from "@inglorious/web"
import { when } from "@inglorious/web/directives/when"

import { t } from "../../i18n/index.js"
import { mailtoUrl } from "../profile.js"
import styles from "./style.module.css"

export const JobTypeRequest = {
  render() {
    const email = import.meta.env.VITE_CONTACT_EMAIL
    return when(
      email,
      () => html`
        <a
          class=${styles.link}
          href=${mailtoUrl(email, {
            subject: t("fields.jobTypeRequestSubject"),
            body: t("fields.jobTypeRequestBody"),
          })}
          >${t("fields.jobTypeRequest")}</a
        >
      `,
    )
  },
}
