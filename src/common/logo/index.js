import { html } from "@inglorious/web"

import styles from "./style.module.css"

// The Vaitu brand: the mark from public/logo.svg and the name beside it. A
// collapsed drawer keeps only the mark, the way the Inglorious UI dashboard
// keeps only its brand image.
export const Logo = {
  render() {
    return html`<span class=${styles.logo}>
      <img class=${styles.mark} src="/logo.svg" alt="" />
      <span class=${styles.name}>vaitu</span>
    </span>`
  },
}
