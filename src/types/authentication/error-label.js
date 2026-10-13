import { html } from "@inglorious/web"

import styles from "./error-label.module.css"

export const ErrorLabel = {
  render({ error }) {
    return error ? html`<p class=${styles.message}>${error}</p>` : ""
  },
}
