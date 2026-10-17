import { IconButton } from "@inglorious/ui/icon-button"
import { MaterialIcon } from "@inglorious/ui/material-icon"

// The reveal control that sits in a password field's trailing slot. Shared by
// login and signup so the three fields cannot drift apart.
export const RevealToggle = {
  render({ isPasswordVisible, inputId, onTogglePassword }) {
    return IconButton.render({
      icon: MaterialIcon.render({
        name: isPasswordVisible ? "visibility_off" : "visibility",
        size: "lg",
      }),
      ariaLabel: isPasswordVisible ? "Hide password" : "Show password",
      variant: "ghost",
      color: "secondary",
      onClick: () => onTogglePassword(inputId),
    })
  },
}
