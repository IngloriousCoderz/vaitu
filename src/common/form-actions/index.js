import { html } from "@inglorious/web"

import styles from "./style.module.css"

// The buttons under a form: full width, stacked, primary action first.
export const FormActions = {
  render({ children }) {
    return html`<div class=${styles.formActions}>${children}</div>`
  },
}
