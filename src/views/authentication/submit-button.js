import { Button } from "@inglorious/ui/button"

import { t } from "../../i18n/index.js"

export const SubmitButton = {
  render({ isBusy, label, busyLabel = t("auth.pleaseWait") }) {
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
