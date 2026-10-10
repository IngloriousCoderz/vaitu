import { html } from "@inglorious/web"

import styles from "./style.module.css"

export const ErrorLabel = {
  render({ error }) {
    return error ? html`<p class=${styles.error}>${error}</p>` : ""
  },
}
