import { html } from "@inglorious/web"

import { t, translated } from "../../i18n/index.js"
import styles from "./style.module.css"

// The quiet stand-in a page shows instead of its content: an error, a loading
// spinner, or an empty state, checked in that order. Each page passes its own
// conditions, because they differ: some pages keep showing stale data on
// error, some count a missing record as still loading.
//
// Loading is the house mark at the centre of the viewport (`/loader.svg`),
// not a per-page sentence — one mark, every wait.
//
// Returns null when the content should render, so a page writes
// `PageStatus.render({ … }) ?? html`…`` and the content is only built once
// there is something to build it from.
export const PageStatus = {
  render({
    isError = false,
    error,
    isLoading = false,
    isEmpty = false,
    emptyText,
  }) {
    if (isError) return html`<p class=${styles.status}>${translated(error)}</p>`
    if (isLoading) {
      return html`<div
        class=${styles.loading}
        role="status"
        aria-live="polite"
        aria-busy="true"
        aria-label=${t("common.loading")}
      >
        <img
          class=${styles.spinner}
          src="/loader.svg"
          alt=""
          width="80"
          height="80"
        />
      </div>`
    }
    if (isEmpty) return html`<p class=${styles.status}>${emptyText}</p>`
    return null
  },
}
