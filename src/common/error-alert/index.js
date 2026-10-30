import { Alert } from "@inglorious/ui/alert"

import { translated } from "../../i18n/index.js"

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
