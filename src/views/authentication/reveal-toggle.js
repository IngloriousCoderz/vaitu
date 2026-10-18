import visibilityOffOutline from "@iconify-icons/material-symbols/visibility-off-outline"
import visibilityOutline from "@iconify-icons/material-symbols/visibility-outline"
import { Icon } from "@inglorious/ui/icon"
import { IconButton } from "@inglorious/ui/icon-button"

// The reveal control that sits in a password field's trailing slot. Shared by
// login and signup so the three fields cannot drift apart.
export const RevealToggle = {
  render({ isPasswordVisible, inputId, onTogglePassword }) {
    return IconButton.render({
      icon: Icon.render({
        icon: isPasswordVisible ? visibilityOffOutline : visibilityOutline,
        size: "lg",
      }),
      ariaLabel: isPasswordVisible ? "Hide password" : "Show password",
      variant: "ghost",
      color: "secondary",
      onClick: () => onTogglePassword(inputId),
    })
  },
}
