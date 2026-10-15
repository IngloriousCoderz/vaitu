import { Button } from "@inglorious/ui/button"

export const SubmitButton = {
  render({ isBusy, label, busyLabel = "Please wait..." }) {
    return Button.render({
      children: isBusy ? busyLabel : label,
      color: "primary",
      shape: "pill",
      size: "md",
      isFullWidth: true,
      isDisabled: isBusy,
      buttonType: "submit",
    })
  },
}
