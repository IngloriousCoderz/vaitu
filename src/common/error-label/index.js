import { html } from "@inglorious/web"
import { when } from "@inglorious/web/directives/when"

import { translated } from "../../i18n/index.js"
import styles from "./style.module.css"

export const ErrorLabel = {
  render({ error }) {
    return when(
      error,
      () => html`<p class=${styles.message}>${translated(error)}</p>`,
    )
  },
}
