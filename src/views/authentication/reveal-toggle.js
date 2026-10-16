import { IconButton } from "@inglorious/ui/icon-button"

import { Icon } from "../../common/icon"

// The reveal control that sits in a password field's trailing slot. Shared by
// login and signup so the three fields cannot drift apart.
export const RevealToggle = {
  render({ isPasswordVisible, inputId, onTogglePassword }) {
    return IconButton.render({
      icon: Icon.render({
        name: isPasswordVisible ? "eye-off" : "eye",
        size: 16,
      }),
      ariaLabel: isPasswordVisible ? "Hide password" : "Show password",
      variant: "ghost",
      size: "sm",
      onClick: () => onTogglePassword(inputId),
    })
  },
}
