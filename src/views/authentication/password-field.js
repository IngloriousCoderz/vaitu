import { Input } from "@inglorious/ui/input"
import { getFieldError, getFieldValue } from "@inglorious/web/form"

import { translated } from "../../i18n/index.js"
import { RevealToggle } from "./reveal-toggle.js"

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
      iconAfter: RevealToggle.render({
        isPasswordVisible: isVisible,
        inputId: id,
        onTogglePassword: onToggle,
      }),
      "data-pw": "",
    })
  },
}
