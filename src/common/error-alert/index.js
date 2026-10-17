import { Alert } from "@inglorious/ui/alert"

// The error banner: the iw Alert calibrated as .vaitu-alert in public/style.css.
// Renders nothing without an error, like ErrorLabel. `className` is for the
// spacing around it, which depends on where it sits.
export const ErrorAlert = {
  render({ error, className = "" }) {
    if (!error) return ""
    return Alert.render({
      severity: "error",
      className: ["vaitu-alert", className].filter(Boolean).join(" "),
      children: error,
    })
  },
}
