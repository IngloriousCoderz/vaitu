import { Alert } from "@inglorious/ui/alert"

import { translated } from "../../i18n/index.js"

// The error banner: the iw Alert calibrated as .vaitu-alert in public/style.css.
// Renders nothing without an error, like ErrorLabel. `className` is for the
// spacing around it, which depends on where it sits. `error` is a message as
// state keeps it, translated here.
export const ErrorAlert = {
  render({ error, className = "" }) {
    if (!error) return ""
    return Alert.render({
      severity: "error",
      className: ["vaitu-alert", className].filter(Boolean).join(" "),
      children: translated(error),
    })
  },
}
