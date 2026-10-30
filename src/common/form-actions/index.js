import { html } from "@inglorious/web"

import styles from "./style.module.css"

export const FormActions = {
  render({ children }) {
    return html`<div class=${styles.formActions}>${children}</div>`
  },
}
