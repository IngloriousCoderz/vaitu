import { html } from "@inglorious/web"

import { t, translated } from "../../i18n/index.js"
import styles from "./style.module.css"

export const PageStatus = {
  render({
    isError = false,
    error,
    isLoading = false,
    isEmpty = false,
    emptyText,
  }) {
    if (isError) return html`<p class=${styles.status}>${translated(error)}</p>`
    if (isLoading)
      return html`<p class=${styles.status} role="status">
        <img
          src="/loader.svg"
          alt=${t("common.loading")}
          width="80"
          height="80"
        />
      </p>`
    if (isEmpty) return html`<p class=${styles.status}>${emptyText}</p>`
    return null
  },
}
