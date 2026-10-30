import { html } from "@inglorious/web"

import styles from "./style.module.css"

export const Logo = {
  render() {
    return html`<span class=${styles.logo}>
      <img class=${styles.mark} src="/logo.svg" alt="" />
      <span class=${styles.name}>vaitu</span>
    </span>`
  },
}
