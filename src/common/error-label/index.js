import { html } from "@inglorious/web"

import { translated } from "../../i18n/index.js"
import styles from "./style.module.css"

export const ErrorLabel = {
  render({ error }) {
    return error
      ? html`<p class=${styles.message}>${translated(error)}</p>`
      : ""
  },
}
