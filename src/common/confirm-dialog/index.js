import { ConfirmDialog as BaseConfirmDialog } from "@inglorious/ui/confirm-dialog"
import { html } from "@inglorious/web"

import { t } from "../../i18n/index.js"
import { ErrorAlert } from "../error-alert/index.js"

export const ConfirmDialog = {
  render({ error = null, children, ...props }) {
    return BaseConfirmDialog.render({
      cancelLabel: t("common.keepIt"),
      closeLabel: t("common.close"),
      ...props,
      children:
        children || error
          ? html`${children}${ErrorAlert.render({ error })}`
          : undefined,
    })
  },
}
