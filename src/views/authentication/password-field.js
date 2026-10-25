import { Input } from "@inglorious/ui/input"
import { getFieldError, getFieldValue } from "@inglorious/web/form"

import { translated } from "../../i18n/index.js"
import { RevealToggle } from "./reveal-toggle.js"

// A password input with its reveal toggle, shared by login and signup so their
// password fields cannot drift apart. `field` names the form value it edits.
export const PasswordField = {
  render({
    id,
    label,
    name,
    field,
    autocomplete,
    entity,
    isVisible,
    onField,
    onToggle,
  }) {
    return Input.render({
      id,
      label,
      name,
      inputType: isVisible ? "text" : "password",
      value: getFieldValue(entity, field, ""),
      placeholder: "••••••••",
      isFullWidth: true,
      isRequired: true,
      error: translated(getFieldError(entity, field)),
      onChange: (value) => onField({ field, value }),
      autocomplete,
      // The reveal button lives in the field's own trailing slot rather than
      // floating over it in a wrapper, which is what stopped the input from
      // taking the full width of the row.
      iconAfter: RevealToggle.render({
        isPasswordVisible: isVisible,
        inputId: id,
        onTogglePassword: onToggle,
      }),
      "data-pw": "",
    })
  },
}
