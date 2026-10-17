import { Input } from "@inglorious/ui/input"
import { html } from "@inglorious/web"

import styles from "./style.module.css"

// Exists only so a password manager can fill the address it was given
// earlier. Labelless on purpose: there is nothing to tell a person about a
// field they never see. The wrapper clips the whole control, so the primitive
// still renders.
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
