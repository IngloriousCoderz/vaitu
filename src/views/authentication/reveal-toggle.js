import visibilityOffOutline from "@iconify-icons/material-symbols/visibility-off-outline"
import visibilityOutline from "@iconify-icons/material-symbols/visibility-outline"
import { Icon } from "@inglorious/ui/icon"
import { IconButton } from "@inglorious/ui/icon-button"

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
      shape: "round",
      size: "sm",
      onClick: () => onTogglePassword(inputId),
    })
  },
}
