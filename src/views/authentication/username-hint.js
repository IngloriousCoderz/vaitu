import { Input } from "@inglorious/ui/input"
import { html } from "@inglorious/web"

import styles from "./style.module.css"

export const UsernameHint = {
  render({ id, email }) {
    return html`<div class=${styles.srOnly}>
      ${Input.render({
        id,
        inputType: "email",
        name: "username",
        value: email,
        isFullWidth: true,
        autocomplete: "username",
        tabindex: -1,
        "aria-hidden": "true",
      })}
    </div>`
  },
}
