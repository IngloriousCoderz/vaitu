import { html } from "@inglorious/web"

import styles from "./style.module.css"

// The quiet line a page shows instead of its content: an error, a loading
// message, or an empty state, checked in that order. Each page passes its own
// conditions, because they differ: some pages keep showing stale data on
// error, some count a missing record as still loading.
//
// Returns null when the content should render, so a page writes
// `PageStatus.render({ … }) ?? html`…`` and the content is only built once
// there is something to build it from.
export const PageStatus = {
  render({
    isError = false,
    error,
    isLoading = false,
    loadingText,
    isEmpty = false,
    emptyText,
  }) {
    if (isError) return html`<p class=${styles.status}>${error}</p>`
    if (isLoading) return html`<p class=${styles.status}>${loadingText}</p>`
    if (isEmpty) return html`<p class=${styles.status}>${emptyText}</p>`
    return null
  },
}
